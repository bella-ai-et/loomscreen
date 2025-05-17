"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEnv } from "@/lib/utils";
import { BUNNY } from "@/constants";
import { Video, CreateVideoInput, UpdateVideoInput, VideoQueryOptions } from "@/types/video";

// Constants
const VIDEO_STREAM_BASE_URL = BUNNY.STREAM_BASE_URL;
const BUNNY_LIBRARY_ID = getEnv("BUNNY_LIBRARY_ID");
const BUNNY_STREAM_ACCESS_KEY = getEnv("BUNNY_STREAM_ACCESS_KEY");

// Helper functions
const revalidatePaths = (paths: string[]) => {
  paths.forEach((path) => revalidatePath(path));
};

const getSupabaseClient = async () => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthenticated");
  return { supabase, userId: session.user.id };
};

// Video Actions
export const getVideoUploadUrl = async () => {
  try {
    const { userId, supabase } = await getSupabaseClient();
    
    // Generate a unique video ID
    const videoId = crypto.randomUUID();
    
    // Create a signed URL for direct upload to Bunny
    const uploadUrl = `${VIDEO_STREAM_BASE_URL}/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`;
    
    // Store video metadata in Supabase
    const { data, error } = await supabase
      .from('videos')
      .insert([
        { 
          id: videoId,
          user_id: userId,
          title: 'Untitled Video',
          is_public: false,
          status: 'uploading'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return { 
      videoId,
      uploadUrl,
      headers: {
        'AccessKey': BUNNY_STREAM_ACCESS_KEY,
        'Content-Type': 'application/octet-stream'
      }
    };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    throw new Error('Failed to generate upload URL');
  }
};

export const createVideo = async (input: CreateVideoInput) => {
  try {
    const { userId, supabase } = await getSupabaseClient();
    
    const { data, error } = await supabase
      .from('videos')
      .insert([
        { 
          ...input,
          user_id: userId,
          is_public: input.is_public ?? false,
          status: 'processing'
        }
      ])
      .select()
      .single();

    if (error) throw error;
    
    revalidatePaths(['/dashboard', '/videos']);
    return data as Video;
  } catch (error) {
    console.error('Error creating video:', error);
    throw new Error('Failed to create video');
  }
};

export const updateVideo = async (input: UpdateVideoInput) => {
  try {
    const { userId, supabase } = await getSupabaseClient();
    
    const { data, error } = await supabase
      .from('videos')
      .update(input)
      .eq('id', input.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    
    revalidatePaths([`/videos/${input.id}`, '/dashboard', '/videos']);
    return data as Video;
  } catch (error) {
    console.error('Error updating video:', error);
    throw new Error('Failed to update video');
  }
};

export const deleteVideo = async (videoId: string) => {
  try {
    const { userId, supabase } = await getSupabaseClient();
    
    // First, get the video to check ownership and get the video_id for Bunny
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !video) {
      throw new Error('Video not found or access denied');
    }

    // Delete from Bunny (if needed)
    // Note: You might want to implement this based on your Bunny CDN setup
    
    // Delete from Supabase
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;
    
    revalidatePaths(['/dashboard', '/videos']);
    return { success: true };
  } catch (error) {
    console.error('Error deleting video:', error);
    throw new Error('Failed to delete video');
  }
};

export const getVideoById = async (videoId: string) => {
  try {
    const { supabase } = await getSupabaseClient();
    
    const { data, error } = await supabase
      .from('videos')
      .select('*, user:user_id(*)')
      .eq('id', videoId)
      .single();

    if (error) throw error;
    
    // Increment view count
    if (data) {
      await supabase
        .from('videos')
        .update({ views: (data.views || 0) + 1 })
        .eq('id', videoId);
    }
    
    return data as Video;
  } catch (error) {
    console.error('Error fetching video:', error);
    throw new Error('Video not found');
  }
};

export const getAllVideos = async (options: VideoQueryOptions = {}) => {
  try {
    const { supabase } = await getSupabaseClient();
    
    let query = supabase
      .from('videos')
      .select('*, user:user_id(*)', { count: 'exact' })
      .eq('is_public', true);
    
    // Apply search query if provided
    if (options.searchQuery) {
      query = query.ilike('title', `%${options.searchQuery}%`);
    }
    
    // Apply sorting
    const sortField = options.sortFilter?.split('-')[0] || 'created_at';
    const sortOrder = options.sortFilter?.endsWith('-desc') ? 'desc' : 'desc';
    
    query = query.order(sortField, { ascending: sortOrder === 'asc' });
    
    // Apply pagination
    const limit = options.limit || 10;
    const offset = options.offset || 0;
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return {
      videos: data as Video[],
      totalCount: count || 0
    };
  } catch (error) {
    console.error('Error fetching videos:', error);
    throw new Error('Failed to fetch videos');
  }
};

export const getUserVideos = async (userId: string, options: VideoQueryOptions = {}) => {
  try {
    const { supabase } = await getSupabaseClient();
    
    let query = supabase
      .from('videos')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);
    
    // Apply search query if provided
    if (options.searchQuery) {
      query = query.ilike('title', `%${options.searchQuery}%`);
    }
    
    // Apply sorting
    const sortField = options.sortFilter?.split('-')[0] || 'created_at';
    const sortOrder = options.sortFilter?.endsWith('-desc') ? 'desc' : 'desc';
    
    query = query.order(sortField, { ascending: sortOrder === 'asc' });
    
    // Apply pagination
    const limit = options.limit || 10;
    const offset = options.offset || 0;
    query = query.range(offset, offset + limit - 1);
    
    const { data, error: queryError, count } = await query;
    
    if (queryError) throw queryError;
    
    return {
      videos: data as Video[],
      totalCount: count || 0
    };
  } catch (error) {
    console.error('Error fetching user videos:', error);
    throw new Error('Failed to fetch user videos');
  }
};

export const getThumbnailUploadUrl = async (videoId: string) => {
  try {
    const { supabase } = await getSupabaseClient();
    const timestamp = Date.now();
    const fileName = `${timestamp}-${videoId}-thumbnail.jpg`;
    
    // Generate a signed URL for uploading the thumbnail
    const { data, error } = await supabase.storage
      .from('thumbnails')
      .createSignedUploadUrl(fileName);

    if (error) throw error;
    
    return {
      uploadUrl: data.signedUrl,
      filePath: fileName,
      publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/thumbnails/${fileName}`
    };
  } catch (error) {
    console.error('Error generating thumbnail upload URL:', error);
    throw new Error('Failed to generate thumbnail upload URL');
  }
};

export const getVideoProcessingStatus = async (videoId: string) => {
  try {
    const { supabase } = await getSupabaseClient();
    
    // Get video status from Bunny
    const response = await fetch(
      `${VIDEO_STREAM_BASE_URL}/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        headers: {
          AccessKey: BUNNY_STREAM_ACCESS_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch video status');
    }

    const data = await response.json();
    const isProcessed = data.status === 4; // 4 means processing is complete in Bunny
    
    // Update video status in Supabase if processing is complete
    if (isProcessed) {
      await supabase
        .from('videos')
        .update({ status: 'processed', duration: data.duration })
        .eq('id', videoId);
    }
    
    return { isProcessed, status: data.status };
  } catch (error) {
    console.error('Error getting video status:', error);
    return { isProcessed: false, status: 'error' };
  }
};

export const incrementVideoViews = async (videoId: string) => {
  try {
    const { supabase } = await getSupabaseClient();
    
    await supabase.rpc('increment_video_views', {
      video_id: videoId
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error incrementing video views:', error);
    return { success: false, error: 'Failed to increment video views' };
  }
};

export const updateVideoVisibility = async (videoId: string, isPublic: boolean) => {
  try {
    const { supabase } = await getSupabaseClient();
    
    const { data, error } = await supabase
      .from('videos')
      .update({ is_public: isPublic })
      .eq('id', videoId)
      .select()
      .single();
    
    if (error) throw error;
    
    revalidatePaths(['/profile', '/video/[videoId]']);
    return { success: true, data };
  } catch (error) {
    console.error('Error updating video visibility:', error);
    return { success: false, error: 'Failed to update video visibility' };
  }
};

export const saveVideoDetails = async (videoId: string, details: {
  title: string;
  description?: string;
  tags?: string[];
  visibility: 'public' | 'private';
}) => {
  try {
    const { supabase } = await getSupabaseClient();
    
    const { data, error } = await supabase
      .from('videos')
      .update({
        title: details.title,
        description: details.description || null,
        tags: details.tags || [],
        is_public: details.visibility === 'public',
        status: 'ready'
      })
      .eq('id', videoId)
      .select()
      .single();
    
    if (error) throw error;
    
    revalidatePaths(['/profile', '/video/[videoId]']);
    return { success: true, data };
  } catch (error) {
    console.error('Error saving video details:', error);
    return { success: false, error: 'Failed to save video details' };
  }
};

export const getAllVideosByUser = async (userId: string, options: VideoQueryOptions = {}) => {
  return getUserVideos(userId, options);
};

export const getTranscript = async (videoId: string) => {
  try {
    const { supabase } = await getSupabaseClient();
    
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .eq('video_id', videoId)
      .single();
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Error getting transcript:', error);
    return { success: false, error: 'Failed to get transcript' };
  }
};
