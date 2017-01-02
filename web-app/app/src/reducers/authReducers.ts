import { IAsyncAction, isAsyncSucceeded, LOGIN_ACTION } from "../actions";
import { IAuthState } from "../state";

const initialState: IAuthState = {
    googleToken: undefined,
    user: undefined,
};
export function authReducer(state: IAuthState = initialState, action: IAsyncAction<IAuthState>) {
    switch (action.type) {
        case LOGIN_ACTION:
            if (isAsyncSucceeded(action)) {
                return Object.assign({}, state, action.value);
            }
        default:
            return state;
    }
}
