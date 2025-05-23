import { QueryClient, QueryFunction } from "@tanstack/react-query";
// import { API_URL } from '@/config';
const API_URL = 'http://localhost:3000'; // TODO: Replace with your actual API URL or env var

const throwIfResNotOk = async (res: Response) => {
  if (!res.ok) {
    const error = await res.json();
    console.error("[queryClient] API error response:", JSON.stringify(error, null, 2));
    throw new Error(`${res.status}: ${JSON.stringify(error)}`);
  }
  return res;
};

export const apiRequest = async (method: string, endpoint: string, data?: any) => {
  console.log("[queryClient] Making API request:", {
    method,
    endpoint,
    data: JSON.stringify(data, null, 2)
  });

  const url = `${API_URL}${endpoint}`;
  console.log("[queryClient] Full URL:", url);

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  if (data) {
    options.body = JSON.stringify(data);
    console.log("[queryClient] Request body:", JSON.stringify(data, null, 2));
  }

  console.log("[queryClient] Request options:", JSON.stringify(options, null, 2));

  try {
    const response = await fetch(url, options);
    console.log("[queryClient] Raw response:", response);
    console.log("[queryClient] Response status:", response.status);
    console.log("[queryClient] Response headers:", JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    
    return throwIfResNotOk(response);
  } catch (error) {
    console.error("[queryClient] Request failed:", error);
    console.error("[queryClient] Error details:", JSON.stringify(error, null, 2));
    throw error;
  }
};

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
