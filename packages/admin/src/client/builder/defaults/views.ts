/**
 * Built-in View Definitions
 */

import FormView from "../../views/collection/form-view.js";
import TableView from "../../views/collection/table-view.js";
import { listView, editView } from "../view/view";

/**
 * Table list view
 */
export const tableView = listView("table", { component: TableView });

/**
 * Form edit view
 */
export const formView = editView("form", { component: FormView });

/**
 * All built-in views
 */
export const builtInViews = {
  table: tableView,
  form: formView,
} as const;
