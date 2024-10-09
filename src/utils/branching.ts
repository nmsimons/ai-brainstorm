import {
	ImplicitFieldSchema,
	TreeView,
	TreeBranchFork,
	getBranch,
	TreeViewConfiguration,
	Tree,
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

		rebaseTempBranch(tempBranch, treeViewBase.view);

		return {
			branch: tempBranch,
			view: tempBranchView,
		};
	}
}

// Listen for changes to the main branch and rebase the temp branch on top of them.
export function rebaseTempBranch(
	tempBranch: TreeBranchFork,
	mainBranch: TreeView<ImplicitFieldSchema>,
): void {
	if (tempBranch.branch === undefined) {
		return;
	}

	mainBranch.events.on("commitApplied", () => {
		console.log("Rebasing temp branch on top of main branch");
		getBranch(mainBranch).rebase(tempBranch);
	});
}
