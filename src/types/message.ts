export type ParentMessageStatus = "open" | "resolved";

export type ParentMessage = {
  messageId: string;
  parentId: string;
  parentName: string;
  parentEmail: string;
  subject: string;
  message: string;
  status: ParentMessageStatus;
  reply: string;
  repliedBy: string;
  createdAt: string;
  updatedAt: string;
};
