import { useCallback, useContext } from "react"
import { AppContext } from "../utils/context"
import { fakeFetch, RegisteredEndpoints } from "../utils/fetch"
import { useWrappedRequest } from "./useWrappedRequest"

export function useCustomFetch() {
  const { cache } = useContext(AppContext)
  const { loading, wrappedRequest } = useWrappedRequest()

  const fetchWithCache = useCallback(
    async <TData, TParams extends object = object>(
      endpoint: RegisteredEndpoints,
      params?: TParams
    ): Promise<TData | null> =>
      wrappedRequest<TData>(async () => {
        const cacheKey = getCacheKey(endpoint, params)
        const cacheResponse = cache?.current.get(cacheKey)

        if (cacheResponse) {
          const data = JSON.parse(cacheResponse)
          return data as Promise<TData>
        }

        const result = await fakeFetch<TData>(endpoint, params)
        cache?.current.set(cacheKey, JSON.stringify(result))
        return result
      }),
    [cache, wrappedRequest]
  )

  const fetchWithoutCache = useCallback(
    async <TData, TParams extends object = object>(
      endpoint: RegisteredEndpoints,
      params?: TParams
    ): Promise<TData | null> =>
      wrappedRequest<TData>(async () => {
        if(endpoint ==='setTransactionApproval'){
          let cacheKeys = !cache?[]:Array.from(cache.current.keys())
          cacheKeys.forEach(key=>{
            if(key.split('@')[0]==='paginatedTransactions' || key.split('@')[0]==='transactionsByEmployee'){
              
              let response = cache?.current.get(key)
              let result = !response?[]:JSON.parse(response)
              let checkboxKeyString=`${endpoint}${params ? `@${JSON.stringify(params)}` : ""}`
              let checkboxKey=JSON.parse(checkboxKeyString.split('@')[1])
              if (result.data){
                let index= result.data.findIndex((x: { id: string })=>x.id===checkboxKey.transactionId)
                if (index>-1) result.data[index].approved= checkboxKey.value
              } 
              else {
                let index= result.findIndex((x: { id: string })=>x.id===checkboxKey.transactionId)
                if (index> -1) result[index].approved= checkboxKey.value
              }
              cache?.current.set(key, JSON.stringify(result))
              console.log(result)
            }
          })
        }
        const result = await fakeFetch<TData>(endpoint, params)
        return result
      }),
    [cache,wrappedRequest]
  )

  const clearCache = useCallback(() => {
    if (cache?.current === undefined) {
      return
    }

    cache.current = new Map<string, string>()
  }, [cache])

  const clearCacheByEndpoint = useCallback(
    (endpointsToClear: RegisteredEndpoints[]) => {
      if (cache?.current === undefined) {
        return
      }

      const cacheKeys = Array.from(cache.current.keys())

      for (const key of cacheKeys) {
        const clearKey = endpointsToClear.some((endpoint) => key.startsWith(endpoint))

        if (clearKey) {
          cache.current.delete(key)
        }
      }
    },
    [cache]
  )

  return { fetchWithCache, fetchWithoutCache, clearCache, clearCacheByEndpoint, loading }
}

function getCacheKey(endpoint: RegisteredEndpoints, params?: object) {
  return `${endpoint}${params ? `@${JSON.stringify(params)}` : ""}`
}
