/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ServicesAccessor } from 'vs/editor/browser/editorExtensions';
import { localize } from 'vs/nls';
import { Action2, MenuId, registerAction2 } from 'vs/platform/actions/common/actions';
import { IClipboardService } from 'vs/platform/clipboard/common/clipboardService';
import { INotebookOutputActionContext, NOTEBOOK_ACTIONS_CATEGORY } from 'vs/workbench/contrib/notebook/browser/controller/coreActions';
import { NOTEBOOK_CELL_HAS_OUTPUTS } from 'vs/workbench/contrib/notebook/common/notebookContextKeys';
import * as icons from 'vs/workbench/contrib/notebook/browser/notebookIcons';
import { ILogService } from 'vs/platform/log/common/log';
import { copyCellOutput } from 'vs/workbench/contrib/notebook/browser/contrib/clipboard/cellOutputClipboard';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { ICellOutputViewModel, ICellViewModel, INotebookEditor, getNotebookEditorFromEditorPane } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { CellKind } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { CodeCellViewModel } from 'vs/workbench/contrib/notebook/browser/viewModel/codeCellViewModel';

export const COPY_OUTPUT_COMMAND_ID = 'notebook.cellOutput.copyToClipboard';

registerAction2(class CopyCellOutputAction extends Action2 {
	constructor() {
		super({
			id: COPY_OUTPUT_COMMAND_ID,
			title: localize('notebookActions.copyOutput', "Copy Output to Clipboard"),
			menu: {
				id: MenuId.NotebookOutputToolbar,
				when: NOTEBOOK_CELL_HAS_OUTPUTS
			},
			category: NOTEBOOK_ACTIONS_CATEGORY,
			icon: icons.copyIcon,
		});
	}

	async run(accessor: ServicesAccessor, outputContext: INotebookOutputActionContext | { outputViewModel: ICellOutputViewModel }): Promise<void> {
		const editorService = accessor.get(IEditorService);
		let outputViewModel: ICellOutputViewModel | undefined;

		if ('outputId' in outputContext && typeof outputContext.outputId === 'string') {
			outputViewModel = getOutputViewModelFromId(outputContext.outputId, editorService);
		} else {
			outputViewModel = outputContext.outputViewModel;
		}

		if (!outputViewModel) {
			return;
		}

		const mimeType = outputViewModel.pickedMimeType?.mimeType;

		if (mimeType?.startsWith('image/')) {
			const editor = editorService.activeEditorPane?.getControl() as INotebookEditor;
			await editor.focusNotebookCell(outputViewModel.cellViewModel as ICellViewModel, 'output', { skipReveal: true, outputId: outputViewModel.model.outputId });
			editor.copyOutputImage(outputViewModel);
		} else {
			const clipboardService = accessor.get(IClipboardService);
			const logService = accessor.get(ILogService);

			copyCellOutput(mimeType, outputViewModel, clipboardService, logService);
		}
	}

});

function getOutputViewModelFromId(outputId: string, editorService: IEditorService): ICellOutputViewModel | undefined {
	const notebookViewModel = getNotebookEditorFromEditorPane(editorService.activeEditorPane)?.getViewModel();
	if (notebookViewModel) {
		const codeCells = notebookViewModel.viewCells.filter(cell => cell.cellKind === CellKind.Code) as CodeCellViewModel[];
		for (const cell of codeCells) {
			const output = cell.outputsViewModels.find(output => output.model.outputId === outputId);
			if (output) {
				return output;
			}
		}
	}

	return undefined;
}