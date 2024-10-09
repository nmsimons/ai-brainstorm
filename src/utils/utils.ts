/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { ImplicitFieldSchema, TreeView, TreeViewConfiguration } from "fluid-framework";
import { Group, Note } from "../schema/app_schema.js";
import { getBranch, TreeBranchFork } from "fluid-framework/alpha";

export const undefinedUserId = "[UNDEFINED]";

export const defaultButtonColor = "bg-gray-600";
export const defaultButtonHoverColor = "bg-gray-700";

export function getRotation(note: Note) {
	const i = hashCode(note.id);

	const rotationArray = [
		"rotate-1",
		"-rotate-2",
		"rotate-2",
		"-rotate-1",
		"-rotate-3",
		"rotate-3",
	];

	return rotationArray[i % rotationArray.length];
}

function hashCode(str: string): number {
	let h = 0;
	for (let i = 0; i < str.length; i++) {
		h = 31 * h + str.charCodeAt(i);
	}
	return h;
}

export enum dragType {
	NOTE = "Note",
	GROUP = "Group",
}

export enum selectAction {
	MULTI,
	REMOVE,
	SINGLE,
}

export interface MainBranch<T extends ImplicitFieldSchema> {
	name: "main";
	view: TreeView<T>;
}

export interface TempBranch<T extends ImplicitFieldSchema> {
	name: "temp";
	view: TreeView<T>;
	branch: TreeBranchFork;
}

export type ViewBranch<T extends ImplicitFieldSchema> = MainBranch<T> | TempBranch<T>;

export const updateBranchField = (text: string, root: Group) => {
	// update the branch field of each note in the temp branch to say temp
	for (const item of root.items) {
		if (item instanceof Note) {
			item.branch = text;
		} else {
			updateBranchField(text, item);
		}
	}
};

// Create a new temp branch if we're not already on one.
export function getTempBranch<T extends ImplicitFieldSchema>(
	currentView: ViewBranch<T>,
	treeViewBase: MainBranch<T>,
): ViewBranch<T> {
	// If we're already on an unmerged temp branch, keep using it.
	// Otherwise, create a new temp branch and return it.
	if (currentView.name === "temp") {
		return currentView;
	} else {
		const tempBranch = getBranch(treeViewBase.view).branch();
		const tempBranchView = tempBranch.viewWith(
			new TreeViewConfiguration({ schema: treeViewBase.view.schema }),
		);

		// update the branch field of each note in the temp branch to say temp
		updateBranchField("temp", tempBranchView.root as unknown as Group);

		return {
			branch: tempBranch,
			view: tempBranchView,
			name: "temp",
		};
	}
}

// Get the main branch
export function getMainBranch<T extends ImplicitFieldSchema>(
	currentView: ViewBranch<T>,
	treeViewBase: MainBranch<T>,
): ViewBranch<T> {
	// update the branch field of each note in the temp branch to say temp
	updateBranchField("temp", treeViewBase.view.root as unknown as Group);

	return treeViewBase;
}
