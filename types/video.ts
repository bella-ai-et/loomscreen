export interface Video {
  id: string;
  title: string;
  description: string | null;
  video_id: string;
  thumbnail_url: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  views: number;
  likes: number;
  user?: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  };
}

export interface CreateVideoInput {
  title: string;
  description?: string;
  video_id: string;
  thumbnail_url?: string;
  is_public?: boolean;
}

export interface UpdateVideoInput {
  id: string;
  title?: string;
  description?: string | null;
  is_public?: boolean;
}

export interface VideoQueryOptions {
  searchQuery?: string;
  sortFilter?: string;
  limit?: number;
  offset?: number;
}
