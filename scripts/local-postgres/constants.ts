export const LOCAL_POSTGRES_COMPOSE_PROJECT = "todo-local"
export const LOCAL_POSTGRES_SERVICE = "postgres"
export const LOCAL_POSTGRES_IMAGE = "postgres:18-alpine"
export const LOCAL_POSTGRES_HOST = "127.0.0.1"
export const LOCAL_POSTGRES_PORT = 5432
export const LOCAL_POSTGRES_DATABASE = "todo"
export const LOCAL_POSTGRES_USER = "todo"
export const LOCAL_POSTGRES_PASSWORD = "todo-local"

export const LOCAL_POSTGRES_URL = `postgresql://${LOCAL_POSTGRES_USER}:${LOCAL_POSTGRES_PASSWORD}@${LOCAL_POSTGRES_HOST}:${LOCAL_POSTGRES_PORT}/${LOCAL_POSTGRES_DATABASE}`

export const LOCAL_POSTGRES_ENDPOINT = `${LOCAL_POSTGRES_HOST}:${LOCAL_POSTGRES_PORT}/${LOCAL_POSTGRES_DATABASE}`

export const LOCAL_SEED_USER = {
  email: "local-dev@example.test",
  password: "Local-dev-password-123!",
  name: "Local developer",
  listName: "Inbox",
} as const
