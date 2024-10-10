import {
	ImplicitFieldSchema,
	TreeView,
	TreeBranchFork,
	getBranch,
	TreeViewConfiguration,
} from "fluid-framework/alpha";

export interface ViewBranch<T extends ImplicitFieldSchema> {
	branch: TreeBranchFork | undefined;
	view: TreeView<T>;
}

export function getTempBranch<T extends ImplicitFieldSchema>(
	currentView: ViewBranch<T>,
	treeViewBase: ViewBranch<T>,
): ViewBranch<T> {
	// If we're already on an unmerged temp branch, keep using it.
	// Otherwise, create a new temp branch and return it.
	if (currentView.branch !== undefined) {
		return currentView;
	} else {
		const tempBranch = getBranch(treeViewBase.view).branch();
		const tempBranchView = tempBranch.viewWith(
			new TreeViewConfiguration({ schema: treeViewBase.view.schema }),
		);

		return {
			branch: tempBranch,
			view: tempBranchView,
		};
	}
}
