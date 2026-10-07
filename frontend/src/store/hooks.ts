import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./index";

/**
 * Typed wrappers around the raw react-redux hooks, so components never have to
 * annotate state or dispatch by hand (and cannot get it wrong).
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
