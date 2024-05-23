import { URLSearchParamsInit, useSearchParams } from "react-router-dom";

export function useQueryState<T>(
  defaultValue: T,
  searchParamName: string = "state"
): readonly [
  searchParamsState: T,
  setSearchParamsState: (newState: T) => void
] {
  const [searchParams, setSearchParams] = useSearchParams();

  const acquiredSearchParam = searchParams.get(searchParamName);
  let searchParamsState: T;

  try {
    searchParamsState = acquiredSearchParam
      ? (JSON.parse(acquiredSearchParam) as T)
      : defaultValue;
  } catch (error) {
    console.error("Failed to parse query param:", error);
    searchParamsState = defaultValue;
  }

  const setSearchParamsState = (newState: T) => {
    const next = new URLSearchParams(searchParams);
    next.set(searchParamName, JSON.stringify(newState));
    setSearchParams(next as unknown as URLSearchParamsInit);
  };

  return [searchParamsState, setSearchParamsState] as const;
}
