import { URLSearchParamsInit, useSearchParams } from "react-router-dom";

export function useQueryState<T>(
  searchParamName: string,
  defaultValue: T
): readonly [
  searchParamsState: T,
  setSearchParamsState: (newState: T) => void
] {
  const [searchParams, setSearchParams] = useSearchParams();

  const acquiredSearchParam = searchParams.get(searchParamName) as T;
  const searchParamsState = acquiredSearchParam ?? defaultValue;

  const setSearchParamsState = (newState: T) => {
    const next = Object.assign(
      {},
      [...searchParams.entries()].reduce(
        (o, [key, value]) => ({ ...o, [key]: value }),
        {}
      ),
      { [searchParamName]: newState }
    ) as URLSearchParamsInit;
    setSearchParams(next);
  };
  return [searchParamsState, setSearchParamsState];
}
