/**
 * In-app worker ↔ farmer chat route. Mount a realtime provider (Supabase channel, Stream, etc.) in {@link WorkerJobChatPage}.
 */
export const workerJobChatPath = (jobId: string) => `/worker/jobs/${encodeURIComponent(jobId)}/chat`;
