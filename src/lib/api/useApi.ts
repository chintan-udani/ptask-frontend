// src/hooks/useApi.ts
import {
  useQuery,
  UseQueryOptions,
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";


const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
export { API_BASE_URL };

// Generic GET with optional params
export function useGet<T>(
  key: string[],
  url: string,
  params?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) {
  // Construct the full URL with base URL
  const baseUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  const finalUrl = params ? buildUrl(baseUrl, params) : baseUrl;

  return useQuery<T>({
    queryKey: params ? [...key, params] : key,
    queryFn: () => apiClient<T>(finalUrl),
    ...options,
  });
}

//  Generic POST
export function usePost<TData, TVariables>(
  url: string,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn">,
  fetchOptions?: RequestInit
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) =>
      apiClient<TData>(url.startsWith('http') ? url : `${API_BASE_URL}${url}`, {
        method: "POST",
        body: JSON.stringify(variables),
        ...(fetchOptions || {}),
      }),
    ...options,
  });
}

type HttpMethod = "POST" | "PUT" | "PATCH" | "DELETE";

//  Generic Mutation Request
export function useMutationRequest<TData, TVariables>(
  method: HttpMethod,
  url: string,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn">,
  fetchOptions?: RequestInit
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) =>
      apiClient<TData>(url.startsWith('http') ? url : `${API_BASE_URL}${url}`, {
        method,
        body:
          method === "DELETE" ? undefined : JSON.stringify(variables),
        ...(fetchOptions || {}),
      }),
    ...options,
  });
}

export function useMutationRequestDynamic<TData, TVariables>(
  method: HttpMethod,
  urlBuilder: (variables: TVariables) => string,
  bodySelector?: (variables: TVariables) => any,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn">,
  fetchOptions?: RequestInit
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) =>
      apiClient<TData>((() => { const u = urlBuilder(variables); return u.startsWith('http') ? u : `${API_BASE_URL}${u}`; })(), {
        method,
        body:
          method === "DELETE"
            ? undefined
            : JSON.stringify(bodySelector ? bodySelector(variables) : variables),
        ...(fetchOptions || {}),
      }),
    ...options,
  });
}

// PUT
export function usePut<TData, TVariables>(
  url: string,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn">
) {
  return useMutationRequest<TData, TVariables>("PUT", url, options);
}

// ✅ PATCH
export function usePatch<TData, TVariables>(
  url: string,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn">
) {
  return useMutationRequest<TData, TVariables>("PATCH", url, options);
}

// ✅ DELETE
export function useDelete<TData, TVariables = void>(
  url: string,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn">
) {
  return useMutationRequest<TData, TVariables>("DELETE", url, options);
}

export function useAdd<TData = any>(
  options?: Omit<UseMutationOptions<TData, Error, any>, "mutationFn">
) {
  return usePost<TData, any>(`${API_BASE_URL}/api/menu/add-menu-item`, options);
}

// ✅ Query Helpers
export function useQueryHelpers() {
  const queryClient = useQueryClient();

  return {
    invalidate: async (key: unknown[]) =>
      queryClient.invalidateQueries({ queryKey: key }),
    reset: async (key: unknown[]) =>
      queryClient.resetQueries({ queryKey: key }),
    set: <TData>(key: unknown[], updater: TData) =>
      queryClient.setQueryData<TData>(key, updater),
    remove: (key: unknown[]) =>
      queryClient.removeQueries({ queryKey: key }),
  };
}

// ✅ POST with FormData body (for file uploads)
export function usePostForm<TData>(
  url: string,
  options?: Omit<UseMutationOptions<TData, Error, FormData>, "mutationFn">,
  fetchOptions?: RequestInit
) {
  return useMutation<TData, Error, FormData>({
    mutationFn: async (formData: FormData) =>
      apiClient<TData>(url.startsWith('http') ? url : `${API_BASE_URL}${url}`, {
        method: "POST",
        body: formData,
        // Override default JSON header so the browser sets multipart boundary
        headers: (fetchOptions?.headers as any) ?? {},
        ...(fetchOptions || {}),
      }),
    ...options,
  });
}

// ✅ DELETE that sends JSON body (some APIs require payload in DELETE)
export function useDeleteJson<TData, TVariables = any>(
  url: string,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn">,
  fetchOptions?: RequestInit
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) =>
      apiClient<TData>(url.startsWith('http') ? url : `${API_BASE_URL}${url}`, {
        method: "DELETE",
        body: JSON.stringify(variables),
        ...(fetchOptions || {}),
      }),
    ...options,
  });
}

// ✅ Internal request helpers
export async function apiClient<T>(url: string, options: RequestInit = {}): Promise<T> {
  const method = options.method || "GET";
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const hasBody = options.body !== undefined && options.body !== null;
  const headers = {
    ...(options.headers || {}),
    ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
  };
  const res = await fetch(url, {
    method,
    headers,
    credentials: "include",
    body: hasBody ? options.body : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (json as any)?.message || "Request failed";
    throw new Error(msg);
  }
  return json as T;
}

export function buildUrl(base: string, params?: Record<string, unknown>) {
  if (!params) return base;
  const url = new URL(base);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    url.searchParams.set(k, String(v));
  });
  return url.toString();
}
