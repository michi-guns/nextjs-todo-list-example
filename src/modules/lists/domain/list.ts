export type ListId = string
export type UserId = string

export interface List {
  readonly id: ListId
  readonly userId: UserId
  readonly name: string
  readonly createdAt: Date
  readonly updatedAt: Date
}
