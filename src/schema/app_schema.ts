/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import {
	TreeViewConfiguration,
	SchemaFactory,
	Tree,
	ValidateRecursiveSchema,
} from "fluid-framework";

// Schema is defined using a factory object that generates classes for objects as well
// as list and map nodes.

// Include a UUID to guarantee that this schema will be uniquely identifiable.
// As this schema uses a recursive type, the beta SchemaFactoryRecursive is used instead of just SchemaFactory.
const sf = new SchemaFactory("fc1db2e8-0a00-11ee-be56-0242ac120002");

// Define the schema for the note object.
// Helper functions for working with the data contained in this object
// are included in this class definition as methods.
export class Note extends sf.object(
	"Note",
	// Fields for Notes which SharedTree will store and synchronize across clients.
	// These fields are exposed as members of instances of the Note class.
	{
		text: sf.string,
		/**
		 * Id to make building the React app simpler.
		 */
		id: sf.identifier,
		author: sf.required(
			sf.string,
			sf.required(sf.number, {
				metadata: {
					llmDefault: () => {
						return "LLM";
					},
				},
			}),
		),
		/**
		 * Sequence of user ids to track which users have voted on this note.
		 */
		votes: sf.array(sf.string),
		created: sf.required(sf.number, { metadata: { llmDefault: () => Date.now() } }),
		lastChanged: sf.required(sf.number, { metadata: { llmDefault: () => Date.now() } }),
	},
	{
		metadata: {
			description:
				"A note is an idea about a subject of a brainstorming session." +
				"The 'text' is the description of the idea and that is where you should focus." +
				"Leave the votes field as an empty array." +
				"When you create a note, put it in the root items array - not in a group.",
		},
	},
) {
	// Update the note text and also update the timestamp in the note
	public readonly updateText = (text: string) => {
		this.lastChanged = new Date().getTime();
		this.text = text;
	};

	public readonly toggleVote = (user: string) => {
		const index = this.votes.indexOf(user);
		if (index > -1) {
			this.votes.removeAt(index);
		} else {
			this.votes.insertAtEnd(user);
		}

		this.lastChanged = new Date().getTime();
	};

	/**
	 * Removes a node from its parent {@link Items}.
	 * If the note is not in an {@link Items}, it is left unchanged.
	 */
	public readonly delete = () => {
		const parent = Tree.parent(this);
		// Use type narrowing to ensure that parent is Items as expected for a note.
		if (Tree.is(parent, Items)) {
			const index = parent.indexOf(this);
			parent.removeAt(index);
		}
	};
}

// Schema for a list of Notes and Groups.
export class Items extends sf.arrayRecursive("Items", [() => Group, Note]) {
	public readonly addNode = (author: string) => {
		const timeStamp = new Date().getTime();

		// Define the note to add to the SharedTree - this must conform to
		// the schema definition of a note
		const newNote = new Note({
			text: "",
			author,
			votes: [],
			created: timeStamp,
			lastChanged: timeStamp,
		});

		// Insert the note into the SharedTree.
		this.insertAtEnd(newNote);
	};

	/**
	 * Add a new group (container for notes) to the SharedTree.
	 */
	public readonly addGroup = (name: string): Group => {
		const group = new Group({
			name,
			items: new Items([]),
		});

		this.insertAtEnd(group);
		return group;
	};
}

{
	// Due to limitations of TypeScript, recursive schema may not produce type errors when declared incorrectly.
	// Using ValidateRecursiveSchema helps ensure that mistakes made in the definition of a recursive schema (like `Items`)
	// will introduce a compile error.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	type _check = ValidateRecursiveSchema<typeof Items>;
}

// Define the schema for the container of notes.
export class Group extends sf.object(
	"Group",
	{
		id: sf.identifier,
		name: sf.string,
		items: Items,
	},
	{
		metadata: {
			description:
				"A group is a collection of related notes. These are stored in the items array." +
				"The 'name' is the description of the group.",
		},
	},
) {
	/**
	 * Removes a group from its parent {@link Items}.
	 * If the note is not in an {@link Items}, it is left unchanged.
	 *
	 * Before removing the group, its children are move to the parent.
	 */
	public readonly delete = () => {
		const parent = Tree.parent(this);
		if (Tree.is(parent, Items)) {
			// Run the deletion as a transaction to ensure that the tree is in a consistent state
			Tree.runTransaction(parent, () => {
				// Move the children of the group to the parent
				if (this.items.length !== 0) {
					const index = parent.indexOf(this);
					parent.moveRangeToIndex(index, 0, this.items.length, this.items);
				}

				// Delete the now empty group
				const i = parent.indexOf(this);
				parent.removeAt(i);
			});
		}
	};
}

// Export the tree config appropriate for this schema.
// This is passed into the SharedTree when it is initialized.
export const appTreeConfiguration = new TreeViewConfiguration(
	// Schema for the root
	{ schema: Group },
);
