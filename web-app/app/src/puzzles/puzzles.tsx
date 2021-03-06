import * as classNames from "classnames";
import { isEqual } from "lodash-es";
import * as moment from "moment";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";

import { IAsyncLoaded, isAsyncLoaded } from "../store/actions/loading";
import {
    addMetaAction,
    assignToMetaAction,
    createManualPuzzleAction,
    deletePuzzleAction,
    IPuzzleInfoChanges,
    loadPuzzlesAction,
    removeMetaAction,
} from "../store/actions/puzzleActions";
import { IAppLifecycle, IAppState, IPuzzle, IPuzzleHierarchy } from "../store/state";
import { MetaSelector } from "./metaSelector";
import { PuzzleHierarchy } from "./puzzleHierarchy";

interface IOwnProps {
    huntKey: string;
    slackTeamId: string;
}

interface IDispatchProps {
    createManualPuzzle?: (puzzleName: string, puzzleLink: string) => void;
    deletePuzzle?: (puzzle: IPuzzle) => void;
    loadPuzzles?: (huntKey: string) => void;
    addMeta?: (puzzle: IPuzzle, isMeta: boolean) => void;
    removeMeta: (meta: IPuzzle, existingPuzzles: IPuzzle[]) => void;
    assignToMeta?: (puzzle: IPuzzle, metaParentKeys: string[]) => void;
}

interface IStateProps {
    lifecycle?: IAppLifecycle;
    puzzles?: IAsyncLoaded<IPuzzle[]>;
}

export interface IPuzzlesProps extends IOwnProps, IDispatchProps, IStateProps {}

export interface IPuzzlesState {
    hasChanges?: boolean;
    hierarchy?: IPuzzleHierarchy;
    isHierarchyLoaded?: boolean;
    newPuzzleName?: string;
    newPuzzleLink?: string;
    parseError?: string;
    puzzleChanges?: { [key: string]: IPuzzleInfoChanges };
    textHierarchy?: string[];
    unsortedPuzzles?: IPuzzle[];
    portalElement?: Element;
    isSelectingMeta: boolean;
    currentlyEditingPuzzle?: IPuzzle;
}

class UnconnectedPuzzles extends React.Component<IPuzzlesProps, IPuzzlesState> {
    public state: IPuzzlesState = {
        hasChanges: false,
        hierarchy: {},
        isHierarchyLoaded: false,
        isSelectingMeta: false,
        newPuzzleName: "",
        newPuzzleLink: "",
        puzzleChanges: {},
        textHierarchy: [],
        unsortedPuzzles: [],
    };

    public componentDidMount() {
        const { huntKey, loadPuzzles } = this.props;
        loadPuzzles(huntKey);
    }

    public componentDidUpdate(oldProps: IPuzzlesProps) {
        const { puzzles, lifecycle } = this.props;
        if (
            (!isAsyncLoaded(oldProps.puzzles) && isAsyncLoaded(puzzles)) ||
            (isAsyncLoaded(oldProps.puzzles) &&
                isAsyncLoaded(puzzles) &&
                oldProps.puzzles.value.length !== puzzles.value.length) ||
            (isAsyncLoaded(puzzles) && !this.state.isHierarchyLoaded) ||
            (isAsyncLoaded(puzzles) &&
                isAsyncLoaded(oldProps.puzzles) &&
                !isEqual(puzzles.value, oldProps.puzzles.value))
        ) {
            // puzzles have changed, reevaluate hierarchy
            const hierarchy: IPuzzleHierarchy = {};
            const sortedPuzzles = puzzles.value.filter(
                puzzle => puzzle.parent != null || (puzzle.parents != null && puzzle.parents.length > 0),
            );
            sortedPuzzles.forEach(puzzle => {
                if (puzzle.parents !== undefined && puzzle.parents.length > 0) {
                    for (const parentKey of puzzle.parents) {
                        if (hierarchy[parentKey] === undefined) {
                            hierarchy[parentKey] = {
                                parent: puzzles.value.find(parentPuzzle => parentPuzzle.key === parentKey),
                                children: [],
                            };
                        }

                        hierarchy[parentKey].children.push(puzzle);
                    }
                } else if (puzzle.parent != null) {
                    const parentKey = puzzle.parent;
                    if (hierarchy[parentKey] === undefined) {
                        hierarchy[parentKey] = {
                            parent: puzzles.value.find(parentPuzzle => parentPuzzle.key === parentKey),
                            children: [],
                        };
                    }

                    hierarchy[parentKey].children.push(puzzle);
                }
            });

            this.setState({
                hierarchy,
                isHierarchyLoaded: true,
                unsortedPuzzles: puzzles.value.filter(
                    puzzle =>
                        puzzle.parent == null &&
                        (puzzle.parents == null || puzzle.parents.length === 0) &&
                        !puzzle.isMeta,
                ),
            });
        }

        if (oldProps.lifecycle.creatingManualPuzzle && !lifecycle.creatingManualPuzzle) {
            this.setState({
                newPuzzleLink: "",
                newPuzzleName: "",
            });
        }
    }

    public render() {
        const { lifecycle, slackTeamId, puzzles } = this.props;
        const { hierarchy, newPuzzleName, newPuzzleLink } = this.state;
        return (
            <div className="puzzles-wrapper">
                <div className="puzzles-container">
                    <h3>Puzzles</h3>
                    <h5>Manually add puzzle</h5>
                    <div className="add-puzzle-form">
                        <div className="error">
                            {lifecycle.createManualPuzzleFailure !== undefined
                                ? lifecycle.createManualPuzzleFailure.message
                                : undefined}
                        </div>
                        <div className="add-puzzle-form-line">
                            <label>Name</label>
                            <input type="text" value={newPuzzleName} onChange={this.handleNewPuzzleNameChange} />
                        </div>
                        <div className="add-puzzle-form-line">
                            <label>Puzzle Link</label>
                            <input type="text" value={newPuzzleLink} onChange={this.handlenewPuzzleLinkChange} />
                            <div className="help-text">Links that already exist will be ignored by the extension</div>
                        </div>
                        <button
                            disabled={
                                lifecycle.creatingManualPuzzle ||
                                newPuzzleName.length === 0 ||
                                newPuzzleLink.length === 0
                            }
                            onClick={this.handleCreateManualPuzzle}
                            className="create-button"
                        >
                            {lifecycle.creatingManualPuzzle ? "Creating..." : "Create"}
                        </button>
                    </div>
                    <h5>Unsorted Puzzles</h5>
                    <div className="unsorted-puzzles-container">
                        {!isAsyncLoaded(puzzles) ? "Loading..." : this.renderUnsortedPuzzles()}
                    </div>
                    <PuzzleHierarchy
                        hierarchy={hierarchy}
                        lifecycle={lifecycle}
                        slackTeamId={slackTeamId}
                        puzzles={puzzles.value}
                        onRemoveMeta={this.props.removeMeta}
                        onPuzzleDelete={this.onPuzzleDelete}
                        onPuzzleNameChange={this.onPuzzleNameChange}
                        onAssignMeta={this.props.assignToMeta}
                    />
                </div>
            </div>
        );
    }

    private maybeRenderMetaSelector(puzzle: IPuzzle) {
        const { isSelectingMeta, portalElement, currentlyEditingPuzzle } = this.state;
        const { puzzles } = this.props;
        if (
            isSelectingMeta &&
            portalElement !== undefined &&
            currentlyEditingPuzzle !== undefined &&
            currentlyEditingPuzzle.key === puzzle.key &&
            isAsyncLoaded(puzzles)
        ) {
            return ReactDOM.createPortal(
                <MetaSelector
                    allPuzzles={puzzles.value}
                    puzzle={currentlyEditingPuzzle}
                    onClose={this.handleMetaSelectorClose}
                    onSave={this.handleAssignToMeta}
                />,
                portalElement,
            );
        }
        return undefined;
    }

    private handleAssignToMeta = (puzzle: IPuzzle, metas: string[]) => {
        this.props.assignToMeta(puzzle, metas);
        this.handleMetaSelectorClose();
    };

    private handleMetaSelectorClose = () => {
        if (this.state.portalElement !== undefined) {
            this.state.portalElement.remove();
        }
        this.setState({ isSelectingMeta: false, currentlyEditingPuzzle: undefined });
    };

    private getSelectorOpenHandler(puzzle: IPuzzle) {
        return () => {
            const portalElement = document.createElement("div");
            portalElement.className = "dialog";
            document.body.appendChild(portalElement);
            this.setState({
                isSelectingMeta: true,
                portalElement,
                currentlyEditingPuzzle: puzzle,
            });
        };
    }

    private handleCreateManualPuzzle = () => {
        const { createManualPuzzle } = this.props;
        const { newPuzzleLink, newPuzzleName } = this.state;
        createManualPuzzle(newPuzzleName, newPuzzleLink);
    };

    private handleNewPuzzleNameChange = (event: React.FormEvent<HTMLInputElement>) => {
        const newPuzzleName = (event.target as HTMLInputElement).value;
        this.setState({ newPuzzleName });
    };

    private handlenewPuzzleLinkChange = (event: React.FormEvent<HTMLInputElement>) => {
        const newPuzzleLink = (event.target as HTMLInputElement).value;
        this.setState({ newPuzzleLink });
    };

    private getGoogleSheetUrl(sheetId: string) {
        return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    }

    private getPuzzleUrl(host: string, path: string) {
        if (host != null) {
            return `http://${host}${path}`;
        } else {
            return "";
        }
    }

    private handlePuzzleNameChange = (puzzle: IPuzzle) => {
        return (event: React.FormEvent<HTMLInputElement>) => {
            const value = (event.target as HTMLInputElement).value;
            this.onPuzzleNameChange(puzzle, value);
        };
    };

    private onPuzzleNameChange = (puzzle: IPuzzle, newName: string) => {
        const changes = { ...this.state.puzzleChanges };
        if (changes[puzzle.key] === undefined) {
            changes[puzzle.key] = {};
        }
        changes[puzzle.key].title = newName;
        this.setState({
            hasChanges: true,
            puzzleChanges: changes,
        });
    };

    private onPuzzleDelete = (puzzle: IPuzzle) => {
        const { deletePuzzle } = this.props;
        if (
            window.confirm(
                "This will delete the associated Google Spreadsheet and archive the Slack channel, are you sure you want to proceed?",
            )
        ) {
            deletePuzzle(puzzle);
        }
    };

    private handleDeletePuzzle = (puzzle: IPuzzle) => {
        return () => {
            this.onPuzzleDelete(puzzle);
        };
    };

    private toggleMeta = (puzzle: IPuzzle) => {
        return () => {
            this.props.addMeta(puzzle, !puzzle.isMeta);
        };
    };

    private renderUnsortedPuzzles() {
        const { lifecycle, slackTeamId } = this.props;
        const { unsortedPuzzles, puzzleChanges } = this.state;
        const puzzleRows = unsortedPuzzles.map(puzzle => {
            const puzzleName =
                puzzleChanges[puzzle.key] !== undefined && puzzleChanges[puzzle.key].title !== undefined
                    ? puzzleChanges[puzzle.key].title
                    : puzzle.name;
            const date = moment(puzzle.createdAt).format("MMM DD, YYYY hh:mm A");
            const isDeleting = lifecycle.deletingPuzzleIds.indexOf(puzzle.key) >= 0;
            return (
                <tr key={puzzle.key}>
                    <td className="puzzle-name">
                        <input type="text" value={puzzleName} onChange={this.handlePuzzleNameChange(puzzle)} />
                    </td>
                    <td>
                        <span className={classNames(puzzle.status, "puzzle-status")}>
                            {puzzle.status.toUpperCase()}
                        </span>
                    </td>
                    <td>{date}</td>
                    <td>
                        <a href={`slack://channel?id=${puzzle.slackChannelId}&team=${slackTeamId}`}>SLACK</a>
                    </td>
                    <td>
                        <a href={this.getGoogleSheetUrl(puzzle.spreadsheetId)} target="_blank">
                            DOC
                        </a>
                    </td>
                    <td>
                        <a href={this.getPuzzleUrl(puzzle.host, puzzle.path)}>SITE</a>
                    </td>
                    <td>
                        <input type="text" readOnly={true} defaultValue={this.getPuzzleUrl(puzzle.host, puzzle.path)} />
                    </td>
                    <td className="puzzle-actions">
                        <button disabled={isDeleting} onClick={this.handleDeletePuzzle(puzzle)}>
                            {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                        <button onClick={this.toggleMeta(puzzle)}>
                            {puzzle.isMeta ? "Remove meta" : "Mark as Meta"}
                        </button>
                        <button onClick={this.getSelectorOpenHandler(puzzle)}>Assign to meta</button>
                        {this.maybeRenderMetaSelector(puzzle)}
                    </td>
                </tr>
            );
        });
        return (
            <table cellPadding="0" cellSpacing="0">
                <thead>
                    <tr>
                        <th>Puzzle</th>
                        <th>Status</th>
                        <th>Created At</th>
                        <th colSpan={3}>Links</th>
                        <th colSpan={3}>Actions</th>
                    </tr>
                </thead>
                <tbody>{puzzleRows}</tbody>
            </table>
        );
    }
}

function mapStateToProps(state: IAppState, _ownProps: IOwnProps): IStateProps {
    return {
        puzzles: state.puzzles,
        lifecycle: state.lifecycle,
    };
}

function mapDispatchToProps(dispatch: Dispatch<IAppState>): IDispatchProps {
    return bindActionCreators(
        {
            createManualPuzzle: createManualPuzzleAction,
            deletePuzzle: deletePuzzleAction,
            loadPuzzles: loadPuzzlesAction,
            addMeta: addMetaAction,
            removeMeta: removeMetaAction,
            assignToMeta: assignToMetaAction,
        },
        dispatch,
    );
}

export const Puzzles = connect(
    mapStateToProps,
    mapDispatchToProps,
)(UnconnectedPuzzles);
