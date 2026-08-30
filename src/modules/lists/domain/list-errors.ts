export class InvalidListNameError extends Error {
  readonly code = "invalid_input" as const

  constructor(message = "List name must contain 1–80 characters") {
    super(message)
    this.name = "InvalidListNameError"
  }
}

export class InvalidPageRequestError extends Error {
  readonly code = "invalid_input" as const

  constructor(message = "Invalid list page request") {
    super(message)
    this.name = "InvalidPageRequestError"
  }
}

export class ListConflictError extends Error {
  readonly code = "conflict" as const

  constructor(message = "A list with this name already exists") {
    super(message)
    this.name = "ListConflictError"
  }
}

export class ListNotFoundError extends Error {
  readonly code = "not_found" as const

  constructor(message = "List not found") {
    super(message)
    this.name = "ListNotFoundError"
  }
}
