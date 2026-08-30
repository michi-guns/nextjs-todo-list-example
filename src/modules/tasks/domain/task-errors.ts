export class InvalidTaskTitleError extends Error {
  readonly code = "invalid_input" as const

  constructor(message = "Task title must contain 1–200 characters") {
    super(message)
    this.name = "InvalidTaskTitleError"
  }
}

export class InvalidTaskNotesError extends Error {
  readonly code = "invalid_input" as const

  constructor(message = "Task notes must contain at most 5,000 characters") {
    super(message)
    this.name = "InvalidTaskNotesError"
  }
}

export class InvalidTaskStatusError extends Error {
  readonly code = "invalid_input" as const

  constructor(message = "Invalid task status") {
    super(message)
    this.name = "InvalidTaskStatusError"
  }
}

export class InvalidTaskPageRequestError extends Error {
  readonly code = "invalid_input" as const

  constructor(message = "Invalid task page request") {
    super(message)
    this.name = "InvalidTaskPageRequestError"
  }
}

export class InvalidTaskPatchError extends Error {
  readonly code = "invalid_input" as const

  constructor(message = "Task update must contain at least one field") {
    super(message)
    this.name = "InvalidTaskPatchError"
  }
}

export class TaskConflictError extends Error {
  readonly code = "conflict" as const

  constructor(message = "A task with this title already exists in the list") {
    super(message)
    this.name = "TaskConflictError"
  }
}

export class TaskNotFoundError extends Error {
  readonly code = "not_found" as const

  constructor(message = "Task not found") {
    super(message)
    this.name = "TaskNotFoundError"
  }
}
