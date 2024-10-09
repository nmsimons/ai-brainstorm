import React, { useState } from "react";
import { Group } from "../schema/app_schema.js";
import { TreeView } from "fluid-framework";
import { PrompterResult } from "../utils/gpt_helpers.js";
import { ViewBranch } from "../utils/branching.js";

enum PromptState {
	Idle,
	Prompting,
	Reviewing,
}

export function HeaderPrompt(props: {
	applyAgentEdits: (
		prompt: string,
		treeView: TreeView<typeof Group>,
		abortController: AbortController,
	) => Promise<PrompterResult>;
	abortController: AbortController;
	currentView: ViewBranch<typeof Group>;
}): JSX.Element {
	const placeholderType = "Type here to talk to a robot...";
	const placeholderTalk = "Talking to a robot...";

	const [promptState, setPromptState] = useState<PromptState>(PromptState.Idle);
	const isPrompting = promptState === PromptState.Prompting;

	const [promptText, setPromptText] = useState("");

	const handleSubmitPrompt = () => {
		const prompt = promptText;
		setPromptState(PromptState.Prompting);
		setPromptText("");

		// Kick off the prompt, applying the edits to the current branch
		props
			.applyAgentEdits(prompt, props.currentView.view, props.abortController)
			.then((result: PrompterResult) => {
				switch (result) {
					case "success":
						console.log("Prompt successful");
						break;
					case "tooManyErrors":
						console.error("Too many errors");
						break;
					case "tooManyModelCalls":
						console.error("Too many model calls");
						break;
					case "aborted":
						console.error("Aborted");
						break;
				}
				// TODO: this should probably cancel out of and return to `Idle` when an error is encountered.
				setPromptState(PromptState.Reviewing);
			});
	};

	const handleCancelClick = () => {
		props.abortController.abort("User cancelled");
		setPromptState(PromptState.Idle);
		setPromptText("");
	};

	// capture the return key to insert the template
	// when the input field is focused
	document.onkeydown = (e) => {
		if (
			e.key === "Enter" &&
			document.activeElement?.id === "insertPrompt" &&
			promptState !== PromptState.Prompting
		) {
			handleSubmitPrompt();
		}
	};

	return (
		<div className="h-full w-full flex flex-row items-center gap-2">
			<div className="flex h-fit w-full">
				<textarea
					disabled={isPrompting}
					placeholder={isPrompting ? placeholderTalk : placeholderType}
					rows={1}
					style={{ resize: "none" }}
					className="w-full bg-white text-black py-1 px-2 rounded-sm"
					value={promptText}
					id="insertPrompt"
					aria-label="Describe the prompt to be passed to the robot"
					onChange={(e) => {
						setPromptText(e.target.value);
					}}
				/>
			</div>
			<div className={`flex h-fit w-fit ${isPrompting ? "hidden" : ""}`}>
				<HeaderPromptButton
					isDisabled={promptText === "" || isPrompting}
					onClick={handleSubmitPrompt}
				/>
			</div>
			<div className={`flex h-fit w-fit ${isPrompting ? "" : "hidden"}`}>
				<HeaderCancelButton onClick={handleCancelClick} />
			</div>
			<div
				className={`flex h-fit w-fit ${
					promptState === PromptState.Reviewing ? "" : "hidden"
				}`}
			></div>
		</div>
	);
}

// React component that renders the button to talk to the robot
export function HeaderPromptButton(props: {
	isDisabled: boolean;
	onClick: () => void;
}): JSX.Element {
	const buttonTalkColor = "bg-gray-500";

	return (
		<HeaderButton
			onClick={() => {
				props.onClick();
			}}
			color={buttonTalkColor}
			isDisabled={props.isDisabled}
			text={"Talk"}
		/>
	);
}

// React component that renders the button to cancel talking to the robot
export function HeaderCancelButton(props: { onClick: () => void }): JSX.Element {
	const buttonCancelColor = "bg-red-500";

	return (
		<HeaderButton
			onClick={() => {
				props.onClick();
			}}
			color={buttonCancelColor}
			text={"Cancel"}
		/>
	);
}

export function HeaderButton(props: {
	text: string;
	onClick: () => void;
	color: string;
	isDisabled?: boolean;
}): JSX.Element {
	return (
		<button
			className={`${props.color} hover:bg-gray-800 text-white font-bold w-20 h-full py-1 px-2 rounded`}
			onClick={() => {
				props.onClick();
			}}
			disabled={props.isDisabled}
		>
			{props.text}
		</button>
	);
}
