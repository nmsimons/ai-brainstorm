/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { useEffect, useState } from "react";
import { Note, Group, Items } from "../schema/app_schema.js";
import { ClientSession } from "../schema/session_schema.js";
import {
	ConnectionState,
	IFluidContainer,
	IMember,
	IServiceAudience,
	Tree,
	TreeView,
} from "fluid-framework";
import { GroupView } from "./group_ux.js";
import { AddNoteButton, NoteView, RootNoteWrapper } from "./note_ux.js";
import {
	Floater,
	NewGroupButton,
	NewNoteButton,
	DeleteNotesButton,
	ButtonGroup,
	UndoButton,
	RedoButton,
	BranchButton,
} from "./button_ux.js";
import { undoRedo } from "../utils/undo.js";
import { MainBranch, ViewBranch } from "../utils/utils.js";

export function Canvas(props: {
	currentView: ViewBranch<typeof Group>;
	treeViewBase: MainBranch<typeof Group>;
	sessionTree: TreeView<typeof ClientSession>;
	audience: IServiceAudience<IMember>;
	container: IFluidContainer;
	fluidMembers: IMember[];
	currentUser: IMember;
	undoRedo: undoRedo;
	setCurrentUser: (arg: IMember) => void;
	setConnectionState: (arg: string) => void;
	setSaved: (arg: boolean) => void;
	setFluidMembers: (arg: IMember[]) => void;
	setCurrentView: (arg: ViewBranch<typeof Group>) => void;
}): JSX.Element {
	useEffect(() => {
		const updateConnectionState = () => {
			if (props.container.connectionState === ConnectionState.Connected) {
				props.setConnectionState("connected");
			} else if (props.container.connectionState === ConnectionState.Disconnected) {
				props.setConnectionState("disconnected");
			} else if (props.container.connectionState === ConnectionState.EstablishingConnection) {
				props.setConnectionState("connecting");
			} else if (props.container.connectionState === ConnectionState.CatchingUp) {
				props.setConnectionState("catching up");
			}
		};
		updateConnectionState();
		props.setSaved(!props.container.isDirty);
		props.container.on("connected", updateConnectionState);
		props.container.on("disconnected", updateConnectionState);
		props.container.on("dirty", () => props.setSaved(false));
		props.container.on("saved", () => props.setSaved(true));
		props.container.on("disposed", updateConnectionState);
	}, [props, props.container]);

	const updateMembers = () => {
		if (props.audience.getMyself() == undefined) return;
		if (props.audience.getMyself()?.id == undefined) return;
		if (props.audience.getMembers() == undefined) return;
		if (props.container.connectionState !== ConnectionState.Connected) return;
		if (props.currentUser === undefined) {
			const user = props.audience.getMyself();
			if (user !== undefined) {
				props.setCurrentUser(user);
			}
		}
		props.setFluidMembers(Array.from(props.audience.getMembers().values()));
	};

	useEffect(() => {
		updateMembers();
	}, []);

	useEffect(() => {
		props.audience.on("membersChanged", updateMembers);
		return () => {
			props.audience.off("membersChanged", updateMembers);
		};
	}, [props.audience]);

	if (props.currentView.name === "temp") {
		console.log("isBranch");
	} else {
		console.log("notBranch");
	}

	return (
		<div className="relative flex grow-0 h-full w-full bg-transparent">
			<ItemsView
				items={props.currentView.view.root.items}
				clientId={props.currentUser.id}
				session={props.sessionTree.root}
				fluidMembers={props.fluidMembers}
			/>
			<Floater>
				<ButtonGroup>
					<NewGroupButton
						items={props.currentView.view.root.items}
						session={props.sessionTree.root}
						clientId={props.currentUser.id}
					/>
					<NewNoteButton
						items={props.currentView.view.root.items}
						clientId={props.currentUser.id}
					/>
					<DeleteNotesButton
						session={props.sessionTree.root}
						items={props.currentView.view.root.items}
						clientId={props.currentUser.id}
					/>
				</ButtonGroup>
				<ButtonGroup>
					<BranchButton
						currentView={props.currentView}
						setCurrentView={props.setCurrentView}
						treeViewBase={props.treeViewBase}
					/>
				</ButtonGroup>
				<ButtonGroup>
					<UndoButton undo={() => props.undoRedo.undo()} />
					<RedoButton redo={() => props.undoRedo.redo()} />
				</ButtonGroup>
			</Floater>
		</div>
	);
}

export function ItemsView(props: {
	items: Items;
	clientId: string;
	session: ClientSession;
	fluidMembers: IMember[];
}): JSX.Element {
	const [itemsArray, setItemsArray] = useState<(Note | Group)[]>(props.items.map((item) => item));

	const parent = Tree.parent(props.items);
	const isRoot = parent === undefined || Tree.parent(parent) === undefined;

	// Register for tree deltas when the component mounts.
	// Any time the items array changes, the app will update.
	useEffect(() => {
		const unsubscribe = Tree.on(props.items, "nodeChanged", () => {
			setItemsArray(props.items.map((item) => item));
		});
		return unsubscribe;
	}, [props.items]);

	const pilesArray = [];
	for (const i of props.items) {
		if (Tree.is(i, Group)) {
			pilesArray.push(
				<GroupView
					key={i.id}
					group={i}
					clientId={props.clientId}
					session={props.session}
					fluidMembers={props.fluidMembers}
				/>,
			);
		} else if (Tree.is(i, Note)) {
			if (isRoot) {
				pilesArray.push(
					<RootNoteWrapper
						key={i.id}
						note={i}
						clientId={props.clientId}
						session={props.session}
						fluidMembers={props.fluidMembers}
					/>,
				);
			} else {
				pilesArray.push(
					<NoteView
						key={i.id}
						note={i}
						clientId={props.clientId}
						session={props.session}
						fluidMembers={props.fluidMembers}
					/>,
				);
			}
		}
	}

	if (isRoot) {
		return (
			<div className="flex grow-0 flex-row h-full w-full flex-wrap gap-4 p-4 content-start overflow-y-scroll">
				{pilesArray}
				<div className="flex w-full h-24"></div>
			</div>
		);
	} else {
		pilesArray.push(
			<AddNoteButton key="newNote" target={props.items} clientId={props.clientId} />,
		);
		return <div className="flex flex-row flex-wrap gap-8 p-2">{pilesArray}</div>;
	}
}
