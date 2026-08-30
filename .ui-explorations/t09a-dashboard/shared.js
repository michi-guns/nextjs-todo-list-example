import fixture from "./fixture.json"

const STATUS_ORDER = ["todo", "in_progress", "done"]
const STATUS_LABELS = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
}

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")

const cloneFixture = () => JSON.parse(JSON.stringify(fixture))

const initials = (name) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

const statusLabel = (status) => STATUS_LABELS[status] ?? status

const currentList = (state) =>
  state.selectedListId === "all"
    ? undefined
    : (state.lists.find((list) => list.id === state.selectedListId) ??
      state.lists[0])

const tasksForList = (state, listId) =>
  state.tasks.filter((task) => task.listId === listId)

const visibleTasksForList = (state, listId) =>
  tasksForList(state, listId).filter(
    (task) => state.showCompleted || !task.completed
  )

const paginated = (tasks, state) => tasks.slice(0, state.page * state.pageSize)

const nextTaskId = (state) => `task-local-${state.nextTaskNumber++}`

function renderBanner() {
  return `<div class="exploration-banner">
    <span><strong>Exploration only</strong> · isolated T-09A prototype · fixture-backed interactions, no production API</span>
    <a href="../../index.html">Compare directions</a>
  </div>`
}

function renderTopbar(state, directionLabel) {
  return `<div class="shell-topbar">
    <div class="brand-lockup"><span class="brand-mark" aria-hidden="true">✓</span><span>Daymark</span><span class="badge">${escapeHtml(directionLabel)}</span></div>
    <div class="user-chip"><span>${escapeHtml(state.user.name)}</span><span class="avatar" aria-hidden="true">${escapeHtml(initials(state.user.name))}</span></div>
  </div>`
}

function renderListForm(state, compact = false) {
  if (!state.listFormMode) return ""
  const isCreate = state.listFormMode === "create"
  return `<form class="list-form surface-card" data-form="list" ${compact ? 'data-compact="true"' : ""}>
    <label class="sr-only" for="list-name">${isCreate ? "New list name" : "Rename list"}</label>
    <input class="field" id="list-name" name="name" maxlength="80" required value="${escapeHtml(isCreate ? "" : (currentList(state)?.name ?? ""))}" placeholder="${isCreate ? "Name your list" : "List name"}" />
    <div class="inline-actions">
      <button class="button primary" type="submit">${isCreate ? "Create list" : "Save name"}</button>
      <button class="button ghost" type="button" data-action="cancel-list-form">Cancel</button>
    </div>
    ${state.error ? `<p class="helper-note" role="alert">${escapeHtml(state.error)}</p>` : ""}
  </form>`
}

function renderListRail(state) {
  return `<aside class="list-rail" aria-label="Lists">
    <div class="rail-heading"><span>Lists</span><button class="icon-button" type="button" data-action="show-list-form" aria-label="Create a list" title="Create a list">＋</button></div>
    <nav class="list-nav" aria-label="Your lists">
      ${state.lists
        .map(
          (
            list
          ) => `<button class="list-item ${list.id === state.selectedListId ? "selected" : ""}" type="button" data-action="select-list" data-list-id="${escapeHtml(list.id)}" aria-current="${list.id === state.selectedListId ? "page" : "false"}">
            <span class="list-item-label">${escapeHtml(list.name)}</span><span class="list-item-count">${tasksForList(state, list.id).length}</span>
          </button>`
        )
        .join("")}
    </nav>
    ${renderListForm(state)}
    <div class="rail-footer">
      <button class="button ghost" type="button" data-action="rename-list">Rename selected</button>
      <button class="button ghost danger" type="button" data-action="delete-list">Delete selected</button>
    </div>
  </aside>`
}

function renderListManager(state) {
  const list = currentList(state)
  const contextLabel = state.selectedListId === "all" ? "All lists" : list?.name
  const needsSpecificList = !list
  return `<div class="toolbar-group">
    <button class="button" type="button" data-action="show-list-form">＋ New list</button>
    <button class="button ghost" type="button" data-action="rename-list" ${needsSpecificList ? 'disabled title="Choose a list to rename it"' : ""}>Rename</button>
    <button class="button ghost danger" type="button" data-action="delete-list" ${needsSpecificList ? 'disabled title="Choose a list to delete it"' : ""}>Delete</button>
    ${contextLabel ? `<span class="subtle">${escapeHtml(contextLabel)}</span>` : ""}
  </div>${renderListForm(state, true)}`
}

function renderListSelect(state, includeAll = false) {
  const selected = state.selectedListId
  return `<label class="toolbar-group"><span class="toolbar-label">List</span><select class="select" data-action="scope-list" aria-label="Choose a list" ${state.loading ? "disabled" : ""}>
    ${includeAll ? `<option value="all" ${selected === "all" ? "selected" : ""}>All lists</option>` : ""}
    ${state.lists.map((list) => `<option value="${escapeHtml(list.id)}" ${list.id === selected ? "selected" : ""}>${escapeHtml(list.name)}</option>`).join("")}
  </select></label>`
}

function renderTaskStatusSelect(task) {
  return `<select class="status-select" data-action="set-status" data-task-id="${escapeHtml(task.id)}" aria-label="Status for ${escapeHtml(task.title)}">
    ${STATUS_ORDER.map((status) => `<option value="${status}" ${status === task.status ? "selected" : ""}>${statusLabel(status)}</option>`).join("")}
  </select>`
}

function renderTaskRow(state, task) {
  const isDone = task.status === "done"
  return `<article class="task-row ${isDone ? "is-done" : ""} ${task.id === state.selectedTaskId ? "selected" : ""}" data-task-id="${escapeHtml(task.id)}">
    <button class="task-check ${isDone ? "checked" : ""}" type="button" data-action="toggle-task" data-task-id="${escapeHtml(task.id)}" aria-label="Mark ${escapeHtml(task.title)} ${isDone ? "to do" : "done"}">${isDone ? "✓" : ""}</button>
    <div class="task-main">
      <p class="task-title">${escapeHtml(task.title)}</p>
      ${task.notes ? `<p class="task-notes">${escapeHtml(task.notes)}</p>` : `<p class="task-notes subtle">No note yet · add context when it helps.</p>`}
      <div class="task-meta"><span class="status-chip ${escapeHtml(task.status)}">${statusLabel(task.status)}</span><span>Private task</span></div>
    </div>
    <div class="task-actions">${renderTaskStatusSelect(task)}<button class="icon-button" type="button" data-action="delete-task" data-task-id="${escapeHtml(task.id)}" aria-label="Delete ${escapeHtml(task.title)}" title="Delete task">×</button></div>
  </article>`
}

function renderTaskList(state, tasks, emptyTitle, emptyCopy) {
  if (state.loading) {
    return `<div class="state-card loading" role="status"><div><strong>Loading tasks…</strong><span>Keeping the current list context.</span></div></div>`
  }
  if (tasks.length === 0) {
    return `<div class="state-card"><div><strong>${escapeHtml(emptyTitle)}</strong><span>${escapeHtml(emptyCopy)}</span></div></div>`
  }
  return `<div class="task-list">${tasks.map((task) => renderTaskRow(state, task)).join("")}</div>`
}

function renderError(state) {
  return state.error && !state.listFormMode
    ? `<div class="state-card error" role="alert"><div><strong>That action needs attention</strong><span>${escapeHtml(state.error)}</span></div></div>`
    : ""
}

function renderFocus(state) {
  const list = currentList(state)
  const allTasks = list ? visibleTasksForList(state, list.id) : []
  const tasks = paginated(allTasks, state)
  const canLoadMore = tasks.length < allTasks.length
  const pending = state.loading ? " disabled" : ""
  return `${renderBanner()}<div class="page">
    <header class="page-header"><div><p class="eyebrow">Direction 01 · focused queue</p><h1>Focus Rail</h1><p class="lede">One selected list, one calm queue, and progressive detail for people who want to know what matters next.</p></div><div class="header-actions"><button class="button" type="button" data-action="simulate-loading"${pending}>↻ Refresh preview</button><a class="button ghost" href="../status-board/index.html">Next direction →</a></div></header>
    <div class="shell rail-shell" aria-busy="${state.loading}">${renderTopbar(state, "Focus Rail")}<div class="shell-body">${renderListRail(state)}<section class="workspace" aria-labelledby="focus-title">
      <div class="workspace-heading"><div><p class="eyebrow">Private workspace</p><h2 id="focus-title">${escapeHtml(list?.name ?? "Choose a list")}</h2><p>${allTasks.length} visible task${allTasks.length === 1 ? "" : "s"} · the next action stays close.</p></div><span class="status-chip in_progress">${list ? "Selected" : "No list"}</span></div>
      <form class="capture-form with-notes" data-form="task"><label class="sr-only" for="focus-task-title">Task title</label><input class="field" id="focus-task-title" name="title" maxlength="160" required placeholder="Capture a task…"${pending} /><label class="sr-only" for="focus-task-notes">Optional note</label><input class="field" id="focus-task-notes" name="notes" maxlength="2000" placeholder="Optional note"${pending} /><button class="button primary" type="submit"${pending}>Add task</button></form>
      ${renderError(state)}
      <div class="toolbar"><span class="toolbar-label">Your queue</span><div class="toolbar-group"><label class="toggle"><input type="checkbox" data-action="toggle-completed" ${state.showCompleted ? "checked" : ""}${pending} /> Show completed</label><button class="button ghost" type="button" data-action="simulate-loading"${pending}>Refresh</button></div></div>
      ${renderTaskList(state, tasks, "This list is clear", state.showCompleted ? "Capture the next useful action above." : "Completed tasks are hidden for this view.")}
      ${canLoadMore ? `<button class="button load-more" type="button" data-action="load-more">${escapeHtml(state.continuationLabel)}</button><p class="helper-note">Showing ${tasks.length} of ${allTasks.length} visible tasks · bounded page ${state.page}.</p>` : `<p class="helper-note">Showing ${tasks.length} of ${allTasks.length} visible tasks · end of this page set.</p>`}
      <details class="danger-zone"><summary>Destructive actions keep their meaning</summary><div class="danger-zone-content"><span>Deleting a list also removes its tasks in the real application.</span><button class="button ghost danger" type="button" data-action="delete-list">Delete selected list</button></div></details>
    </section></div></div>
    <p class="comparison-note"><strong>Hypothesis:</strong> a persistent rail keeps list context visible while the single queue reduces decision fatigue. Trade-off: comparing several statuses requires more navigation.</p>
  </div>${renderToast(state)}`
}

function renderBoardTask(state, task) {
  return `<article class="task-card" data-task-id="${escapeHtml(task.id)}"><p class="task-title">${escapeHtml(task.title)}</p>${task.notes ? `<p class="task-notes">${escapeHtml(task.notes)}</p>` : `<p class="task-notes subtle">No note yet.</p>`}<div class="task-card-footer"><span class="status-chip ${escapeHtml(task.status)}">${statusLabel(task.status)}</span>${renderTaskStatusSelect(task)}</div></article>`
}

function renderBoard(state) {
  const list = currentList(state)
  const allTasks = list ? visibleTasksForList(state, list.id) : []
  const tasks = paginated(allTasks, state)
  const canLoadMore = tasks.length < allTasks.length
  const pending = state.loading ? " disabled" : ""
  return `${renderBanner()}<div class="page">
    <header class="page-header"><div><p class="eyebrow">Direction 02 · state visibility</p><h1>Status Board</h1><p class="lede">Three lanes turn task status into the organizing principle, making work in progress visible at a glance.</p></div><div class="header-actions"><button class="button" type="button" data-action="simulate-loading"${pending}>↻ Refresh preview</button><a class="button ghost" href="../command-inspector/index.html">Next direction →</a></div></header>
    <div class="shell board-shell" aria-busy="${state.loading}">${renderTopbar(state, "Status Board")}<div class="shell-body"><section class="workspace status-board" aria-labelledby="board-title">
      <div class="board-toolbar"><div><p class="eyebrow">Selected list</p><h2 id="board-title">${escapeHtml(list?.name ?? "Choose a list")}</h2><p class="muted">Move the work across lanes without opening a second context.</p></div>${renderListSelect(state)}${renderListManager(state)}</div>
      <form class="capture-form with-notes" data-form="task"><label class="sr-only" for="board-task-title">Task title</label><input class="field" id="board-task-title" name="title" maxlength="160" required placeholder="Add a task to this list…"${pending} /><label class="sr-only" for="board-task-notes">Optional note</label><input class="field" id="board-task-notes" name="notes" maxlength="2000" placeholder="Optional note"${pending} /><button class="button primary" type="submit"${pending}>Add task</button></form>
      ${renderError(state)}
      <div class="toolbar"><span class="toolbar-label">${tasks.length} of ${allTasks.length} visible tasks</span><div class="toolbar-group"><label class="toggle"><input type="checkbox" data-action="toggle-completed" ${state.showCompleted ? "checked" : ""}${pending} /> Show completed</label><button class="button ghost" type="button" data-action="simulate-loading"${pending}>Refresh</button></div></div>
      ${
        state.loading
          ? `<div class="state-card loading" role="status"><div><strong>Loading board…</strong><span>Preserving the selected list and lane positions.</span></div></div>`
          : `<div class="board-grid">${STATUS_ORDER.map((status) => {
              const laneTasks = tasks.filter((task) => task.status === status)
              return `<section class="board-lane ${status}" aria-labelledby="lane-${status}"><div class="lane-heading"><h3 id="lane-${status}">${statusLabel(status)}</h3><span class="count-chip">${laneTasks.length}</span></div><div class="lane-cards">${laneTasks.length ? laneTasks.map((task) => renderBoardTask(state, task)).join("") : `<p class="board-empty">${status === "done" && !state.showCompleted ? "Completed hidden" : "No tasks here yet"}</p>`}</div></section>`
            }).join("")}</div>`
      }
      ${canLoadMore ? `<button class="button load-more" type="button" data-action="load-more">${escapeHtml(state.continuationLabel)}</button>` : `<p class="helper-note">End of this page set · changing the list or filter resets pagination.</p>`}
      <details class="danger-zone"><summary>Destructive actions keep their meaning</summary><div class="danger-zone-content"><span>Deleting a list also removes its tasks in the real application.</span><button class="button ghost danger" type="button" data-action="delete-list">Delete selected list</button></div></details>
    </section></div></div>
    <p class="comparison-note"><strong>Hypothesis:</strong> status lanes optimize throughput and state visibility. Trade-off: the dense three-column model creates horizontal pressure on narrow screens.</p>
  </div>${renderToast(state)}`
}

function commandTasks(state) {
  const scope =
    state.selectedListId === "all"
      ? state.tasks
      : tasksForList(state, state.selectedListId)
  return scope
    .filter((task) => state.showCompleted || !task.completed)
    .filter((task) => {
      const query = state.query.trim().toLowerCase()
      return (
        !query ||
        `${task.title} ${task.notes ?? ""}`.toLowerCase().includes(query)
      )
    })
}

function renderResultItem(state, task) {
  const list = state.lists.find((item) => item.id === task.listId)
  return `<button class="result-item ${task.id === state.selectedTaskId ? "selected" : ""}" type="button" data-action="select-task" data-task-id="${escapeHtml(task.id)}" aria-label="${escapeHtml(`${task.title} · ${list?.name ?? "Unknown list"} · ${statusLabel(task.status)}`)}"><span class="task-check ${task.completed ? "checked" : ""}" aria-hidden="true">${task.completed ? "✓" : ""}</span><span><span class="task-title">${escapeHtml(task.title)}</span><span class="result-context">${escapeHtml(list?.name ?? "Unknown list")} · ${statusLabel(task.status)}</span></span><span class="subtle">›</span></button>`
}

function renderInspector(state, task) {
  if (!task)
    return `<aside class="inspector"><div class="state-card"><div><strong>Select a task</strong><span>Search or capture something, then inspect it here.</span></div></div></aside>`
  const list = state.lists.find((item) => item.id === task.listId)
  return `<aside class="inspector" aria-labelledby="inspector-title"><div class="inspector-heading"><div><p class="eyebrow">Task inspector</p><h2 id="inspector-title">${escapeHtml(task.title)}</h2><p class="muted">${escapeHtml(list?.name ?? "Unknown list")}</p></div><button class="icon-button" type="button" data-action="delete-task" data-task-id="${escapeHtml(task.id)}" aria-label="Delete task" title="Delete task">×</button></div>
    <div class="inspector-section"><span class="inspector-label">Status</span>${renderTaskStatusSelect(task)}</div>
    <div class="inspector-section"><span class="inspector-label">Notes</span><form data-form="note"><label class="sr-only" for="inspector-notes">Task notes</label><textarea class="textarea" id="inspector-notes" name="notes" maxlength="2000" placeholder="Add context">${escapeHtml(task.notes ?? "")}</textarea><button class="button primary" type="submit">Save note</button></form></div>
    <div class="inspector-section"><span class="inspector-label">Context</span><p class="inspector-value">Private task · changes stay in this prototype fixture.</p></div>
  </aside>`
}

function renderCommand(state) {
  const matches = commandTasks(state)
  const tasks = paginated(matches, state)
  const selectedTask =
    state.tasks.find(
      (task) =>
        task.id === state.selectedTaskId &&
        matches.some((item) => item.id === task.id)
    ) ?? tasks[0]
  const canLoadMore = tasks.length < matches.length
  const pending = state.loading ? " disabled" : ""
  return `${renderBanner()}<div class="page">
    <header class="page-header"><div><p class="eyebrow">Direction 03 · fast retrieval</p><h1>Command Inspector</h1><p class="lede">A command/search spine keeps capture and retrieval close to a persistent inspector for keyboard-oriented return visits.</p></div><div class="header-actions"><button class="button" type="button" data-action="simulate-loading"${pending}>↻ Refresh preview</button><a class="button ghost" href="../focus-rail/index.html">← First direction</a></div></header>
    <div class="shell command-shell" aria-busy="${state.loading}">${renderTopbar(state, "Command Inspector")}<div class="shell-body"><section class="workspace" aria-labelledby="command-title">
      <div class="command-layout"><div class="command-spine"><div class="command-header"><div><p class="eyebrow">Command spine</p><h2 id="command-title">Find or capture</h2></div><span class="command-key">⌘ K</span></div>
        <div class="command-search"><span aria-hidden="true">⌕</span><label class="sr-only" for="command-query">Search tasks</label><input class="field" id="command-query" name="query" data-action="scope-search" value="${escapeHtml(state.query)}" placeholder="Search tasks and notes…" autocomplete="off"${pending} /><span class="command-key">/</span></div>
        <div class="command-filter-row">${renderListSelect(state, true)}<label class="toggle"><input type="checkbox" data-action="toggle-completed" ${state.showCompleted ? "checked" : ""}${pending} /> Show completed</label></div>
        <form class="capture-form with-notes" data-form="task"><label class="sr-only" for="command-task-title">Task title</label><input class="field" id="command-task-title" name="title" maxlength="160" required placeholder="Capture a task…"${pending} /><label class="sr-only" for="command-task-notes">Optional note</label><input class="field" id="command-task-notes" name="notes" maxlength="2000" placeholder="Optional note"${pending} /><button class="button primary" type="submit"${pending}>Capture</button></form>
        ${renderError(state)}
        <div class="section-heading"><div><h3>Results</h3><p class="muted">${matches.length} matching task${matches.length === 1 ? "" : "s"} · local search simulation</p></div>${renderListManager(state)}</div>
        ${state.loading ? `<div class="state-card loading" role="status"><div><strong>Refreshing index…</strong><span>Keeping the current query and inspector selection.</span></div></div>` : matches.length ? `<div class="result-list">${tasks.map((task) => renderResultItem(state, task)).join("")}</div>` : `<div class="state-card"><div><strong>No matching tasks</strong><span>Try another term or capture a new task above.</span></div></div>`}
        ${canLoadMore ? `<button class="button load-more" type="button" data-action="load-more">${escapeHtml(state.continuationLabel)}</button>` : `<p class="helper-note">${matches.length ? "End of this page set." : "Search is ready for a new task."}</p>`}
      </div>${renderInspector(state, selectedTask)}</div>
      <details class="danger-zone"><summary>Destructive actions keep their meaning</summary><div class="danger-zone-content"><span>Deleting a task is explicit and removes it from the private fixture.</span><button class="button ghost danger" type="button" data-action="delete-task" data-task-id="${escapeHtml(selectedTask?.id ?? "")}" ${selectedTask ? "" : "disabled"}>Delete selected task</button></div></details>
    </section></div></div>
    <p class="comparison-note"><strong>Hypothesis:</strong> a global command/search spine plus inspector improves rapid re-entry and continuity. Trade-off: browse-first users must discover the search model before it feels natural.</p>
  </div>${renderToast(state)}`
}

function renderToast(state) {
  return state.toast
    ? `<div class="toast" role="status">${escapeHtml(state.toast)}</div>`
    : ""
}

function setError(state, message) {
  state.error = message
  state.toast = ""
}

function clearTransient(state) {
  state.error = ""
}

function resetPaging(state) {
  state.page = 1
}

function render(root, state, direction) {
  root.innerHTML =
    direction === "focus-rail"
      ? renderFocus(state)
      : direction === "status-board"
        ? renderBoard(state)
        : renderCommand(state)
}

function getFormValue(form, name) {
  return new FormData(form).get(name)?.toString().trim() ?? ""
}

function createTask(state, form) {
  const title = getFormValue(form, "title")
  const notes = getFormValue(form, "notes")
  if (!title) {
    setError(state, "Add a task title before capturing it.")
    return
  }
  const listId =
    state.selectedListId === "all" ? state.lists[0]?.id : state.selectedListId
  if (!listId) {
    setError(state, "Choose a list before capturing a task.")
    return
  }
  const task = {
    id: nextTaskId(state),
    listId,
    title,
    notes: notes || null,
    status: "todo",
    completed: false,
  }
  state.tasks.unshift(task)
  state.selectedTaskId = task.id
  resetPaging(state)
  state.query = ""
  state.toast = `Captured “${title}” in ${state.lists.find((list) => list.id === listId)?.name ?? "your list"}.`
  clearTransient(state)
}

function handleClick(event, root, state) {
  const target = event.target.closest("[data-action]")
  if (!target || !root.contains(target)) return
  const action = target.dataset.action
  if (action === "select-list") {
    state.selectedListId = target.dataset.listId
    resetPaging(state)
    state.query = ""
    state.selectedTaskId =
      tasksForList(state, state.selectedListId)[0]?.id ?? ""
    clearTransient(state)
  } else if (action === "show-list-form") {
    state.listFormMode = "create"
    clearTransient(state)
  } else if (action === "rename-list") {
    if (!currentList(state))
      setError(state, "Create a list before renaming one.")
    else state.listFormMode = "rename"
  } else if (action === "cancel-list-form") {
    state.listFormMode = ""
    clearTransient(state)
  } else if (action === "delete-list") {
    const list = currentList(state)
    if (!list) setError(state, "There is no selected list to delete.")
    else if (state.lists.length === 1)
      setError(
        state,
        "Keep one list available so the workspace has a destination."
      )
    else if (window.confirm(`Delete “${list.name}” and its tasks?`)) {
      state.lists = state.lists.filter((item) => item.id !== list.id)
      state.tasks = state.tasks.filter((task) => task.listId !== list.id)
      state.selectedListId = state.lists[0].id
      state.selectedTaskId =
        tasksForList(state, state.selectedListId)[0]?.id ?? ""
      resetPaging(state)
      state.toast = `Deleted ${list.name}.`
      clearTransient(state)
    }
  } else if (action === "toggle-task") {
    const task = state.tasks.find((item) => item.id === target.dataset.taskId)
    if (task) {
      task.status = task.status === "done" ? "todo" : "done"
      task.completed = task.status === "done"
      state.selectedTaskId = task.id
      state.toast = `${task.status === "done" ? "Completed" : "Reopened"} “${task.title}”.`
      clearTransient(state)
    }
  } else if (action === "delete-task") {
    const task = state.tasks.find((item) => item.id === target.dataset.taskId)
    if (task && window.confirm(`Delete “${task.title}”?`)) {
      state.tasks = state.tasks.filter((item) => item.id !== task.id)
      if (state.selectedTaskId === task.id) state.selectedTaskId = ""
      state.toast = `Deleted “${task.title}”.`
      clearTransient(state)
    }
  } else if (action === "select-task") {
    state.selectedTaskId = target.dataset.taskId
    clearTransient(state)
  } else if (action === "load-more") {
    state.page += 1
    clearTransient(state)
  } else if (action === "simulate-loading") {
    state.loading = true
    clearTransient(state)
    render(root, state, root.dataset.direction)
    window.setTimeout(() => {
      state.loading = false
      state.toast = "Preview refreshed without losing your context."
      render(root, state, root.dataset.direction)
      window.setTimeout(() => {
        state.toast = ""
        render(root, state, root.dataset.direction)
      }, 2200)
    }, 500)
    return
  }
  render(root, state, root.dataset.direction)
}

function handleChange(event, root, state) {
  const target = event.target
  const action = target.dataset.action
  let changed = false
  if (action === "toggle-completed") {
    state.showCompleted = target.checked
    resetPaging(state)
    clearTransient(state)
    changed = true
  } else if (action === "scope-list") {
    state.selectedListId = target.value
    resetPaging(state)
    state.selectedTaskId =
      state.selectedListId === "all"
        ? (state.tasks[0]?.id ?? "")
        : (tasksForList(state, state.selectedListId)[0]?.id ?? "")
    clearTransient(state)
    changed = true
  } else if (action === "set-status") {
    const task = state.tasks.find((item) => item.id === target.dataset.taskId)
    if (task && STATUS_ORDER.includes(target.value)) {
      task.status = target.value
      task.completed = target.value === "done"
      state.selectedTaskId = task.id
      state.toast = `Moved “${task.title}” to ${statusLabel(task.status)}.`
      clearTransient(state)
      changed = true
    }
  }
  if (changed) render(root, state, root.dataset.direction)
}

function handleInput(event, root, state) {
  if (event.target.dataset.action === "scope-search") {
    state.query = event.target.value
    resetPaging(state)
    render(root, state, root.dataset.direction)
    const search = root.querySelector("#command-query")
    if (search) {
      search.focus()
      search.setSelectionRange(search.value.length, search.value.length)
    }
  }
}

function handleSubmit(event, root, state) {
  event.preventDefault()
  const form = event.target
  if (form.dataset.form === "task") {
    createTask(state, form)
  } else if (form.dataset.form === "list") {
    const name = getFormValue(form, "name")
    if (name.length < 1 || name.length > 80) {
      setError(state, "List names must be between 1 and 80 characters.")
    } else if (state.listFormMode === "rename") {
      const list = currentList(state)
      if (list) {
        list.name = name
        state.toast = `Renamed the list to ${name}.`
        state.listFormMode = ""
        clearTransient(state)
      }
    } else {
      const id = `list-local-${state.nextListNumber++}`
      state.lists.push({ id, name })
      state.selectedListId = id
      state.selectedTaskId = ""
      state.listFormMode = ""
      resetPaging(state)
      state.toast = `Created ${name}.`
      clearTransient(state)
    }
  } else if (form.dataset.form === "note") {
    const task = state.tasks.find((item) => item.id === state.selectedTaskId)
    if (task) {
      task.notes = getFormValue(form, "notes") || null
      state.toast = "Saved the task note."
      clearTransient(state)
    }
  }
  render(root, state, root.dataset.direction)
}

export function bootstrap() {
  const root = document.querySelector("[data-app]")
  if (!root) return
  const direction = root.dataset.direction
  const data = cloneFixture()
  const state = {
    ...data,
    selectedListId: direction === "command-inspector" ? "all" : "launch-week",
    selectedTaskId: "task-audit",
    showCompleted: true,
    page: 1,
    pageSize: data.pagination?.pageSize ?? 3,
    continuationLabel: data.pagination?.continuationLabel ?? "Load more",
    loading: false,
    error: "",
    toast: "",
    query: "",
    listFormMode: "",
    nextTaskNumber: 1,
    nextListNumber: 1,
  }
  root.dataset.direction = direction
  root.addEventListener("click", (event) => handleClick(event, root, state))
  root.addEventListener("change", (event) => handleChange(event, root, state))
  root.addEventListener("input", (event) => handleInput(event, root, state))
  root.addEventListener(
    "submit",
    (event) => handleSubmit(event, root, state),
    true
  )
  render(root, state, direction)
}
