import { LOGOUT_ACTION } from "../actions/authActions";
import {
    AsyncActionStatus,
    getAsyncLoadedValue,
    IAsyncAction,
    IAsyncLoaded,
    isAsyncSucceeded,
} from "../actions/loading";
import {
    ADD_META_ACTION,
    ASSIGN_TO_META,
    CREATE_PUZZLE_ACTION,
    ICreatePuzzleActionPayload,
    IGNORE_DISCOVERED_PAGE_ACTION,
    LOAD_DISCOVERED_PUZZLES_ACTION,
    LOAD_IGNORED_PAGES_ACTION,
    LOAD_PUZZLES_ACTION,
    SAVE_DISCOVERED_PAGE_CHANGES_ACTION,
} from "../actions/puzzleActions";
import { REMOVE_META_ACTION } from "../actions/puzzleActions";
import { IDiscoveredPage, IPuzzle } from "../state";

const puzzlesInitialState: IAsyncLoaded<IPuzzle[]> = {
    status: AsyncActionStatus.NONE,
};

export function puzzlesReducer(state: IAsyncLoaded<IPuzzle[]> = puzzlesInitialState, action: IAsyncAction<any>) {
    switch (action.type) {
        case LOAD_PUZZLES_ACTION:
            return { ...state, ...getAsyncLoadedValue(action) };
        case LOGOUT_ACTION:
            if (isAsyncSucceeded(action)) {
                return puzzlesInitialState;
            }
        case ADD_META_ACTION:
            if (isAsyncSucceeded(action)) {
                const index = state.value.findIndex(puzzle => puzzle.key === action.payload.key);
                return {
                    ...state,
                    value: [
                        ...state.value.slice(0, index),
                        {
                            ...state.value[index],
                            isMeta: true,
                        },
                        ...state.value.slice(index + 1),
                    ],
                };
            }
        case REMOVE_META_ACTION:
            if (isAsyncSucceeded(action)) {
                const existingPuzzles: IPuzzle[] = action.payload.existingPuzzles;
                return {
                    ...state,
                    value: state.value.map(puzzle => {
                        if (puzzle.key === action.payload.metaKey) {
                            return {
                                ...puzzle,
                                isMeta: false,
                            };
                        } else if (existingPuzzles.some(existingPuzzle => existingPuzzle.key === puzzle.key)) {
                            return {
                                ...puzzle,
                                parent: null,
                                parents:
                                    puzzle.parents != null
                                        ? puzzle.parents.filter(parentKey => parentKey !== action.payload.metaKey)
                                        : [],
                            };
                        } else {
                            return puzzle;
                        }
                    }),
                };
            }
        case ASSIGN_TO_META:
            if (isAsyncSucceeded(action)) {
                const index = state.value.findIndex(puzzle => puzzle.key === action.payload.key);
                return {
                    ...state,
                    value: [
                        ...state.value.slice(0, index),
                        {
                            ...state.value[index],
                            parents: action.payload.parents,
                            parent: undefined,
                        },
                        ...state.value.slice(index + 1),
                    ],
                };
            }
        default:
            return state;
    }
}

const initialState: IAsyncLoaded<IDiscoveredPage[]> = {
    status: AsyncActionStatus.NONE,
};

export function discoveredPageReducer(
    state: IAsyncLoaded<IDiscoveredPage[]> = initialState,
    action: IAsyncAction<any>,
) {
    switch (action.type) {
        case LOAD_DISCOVERED_PUZZLES_ACTION:
            return { ...state, ...getAsyncLoadedValue(action) };
        case LOGOUT_ACTION:
            if (isAsyncSucceeded(action)) {
                return initialState;
            }
        default:
            return state;
    }
}

export function ignoredPagesReducer(state: IAsyncLoaded<IDiscoveredPage[]> = initialState, action: IAsyncAction<any>) {
    switch (action.type) {
        case LOGOUT_ACTION:
            if (isAsyncSucceeded(action)) {
                return initialState;
            }
        case LOAD_IGNORED_PAGES_ACTION:
            return { ...state, ...getAsyncLoadedValue(action) };
        case IGNORE_DISCOVERED_PAGE_ACTION:
            if (isAsyncSucceeded(action)) {
                return { ...state, value: state.value.concat(action.value) };
            }
        case CREATE_PUZZLE_ACTION:
            if (isAsyncSucceeded(action)) {
                let ignoredPages = state.value;
                // for now only create one puzzle at a time
                const changedPages = action.value as ICreatePuzzleActionPayload;
                if (changedPages.changedPages.length > 0) {
                    const createdPuzzlePage = changedPages.changedPages[0];
                    ignoredPages = ignoredPages.filter(page => page.key !== createdPuzzlePage.key);
                }
                return { ...state, value: ignoredPages };
            }
        case SAVE_DISCOVERED_PAGE_CHANGES_ACTION:
            if (isAsyncSucceeded(action)) {
                const changedPagesValue = action.value as IDiscoveredPage[];
                const changedPages = changedPagesValue.filter(page => page.ignored);
                const discoveredPages = state.value.slice();
                changedPages.forEach(changedPage => {
                    const changedIndex = discoveredPages.findIndex(page => page.key === changedPage.key);
                    discoveredPages[changedIndex] = changedPage;
                });
                return { ...state, value: discoveredPages };
            }
        default:
            return state;
    }
}
