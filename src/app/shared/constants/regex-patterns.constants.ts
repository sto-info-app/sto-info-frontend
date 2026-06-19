import {
  MAX_CHARS_PASSWORD,
  MAX_CHARS_USERNAME,
  MIN_CHARS_PASSWORD,
  MIN_CHARS_USERNAME,
} from './forms.constants';

export const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const USERNAME_PATTERN = new RegExp(
  `^[a-zA-Z0-9]{${MIN_CHARS_USERNAME},${MAX_CHARS_USERNAME}}$`,
);

export const PASSWORD_PATTERN = new RegExp(
  `^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9\n\r\t]).{${MIN_CHARS_PASSWORD},${MAX_CHARS_PASSWORD}}$`,
);

export const CHARACTER_NAME_PATTERN =
  /^[A-Za-z'.-]([A-Za-z' .-]*[A-Za-z'.-])?$/;
export const STO_HANDLE_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]{2,15}(#\d{4,})?$/;

export const WHITESPACE_PATTERN = /\s+/g;
export const TRAILING_ZEROS_PATTERN = /\.?0{1,2}$/;

export const MARKDOWN_FENCED_CODE_BLOCK_PATTERN = /```([\s\S]*?)```/g;
export const MARKDOWN_LEADING_NEWLINE_PATTERN = /^\n/;
export const MARKDOWN_BLOCK_SPLIT_PATTERN = /\n{2,}/;
export const MARKDOWN_CODE_PLACEHOLDER_PATTERN = /CODE(\d+)/g;
export const MARKDOWN_CODE_PLACEHOLDER_BLOCK_PATTERN = /^CODE\d+$/;
export const MARKDOWN_HORIZONTAL_RULE_PATTERN = /^(-{3,}|\*{3,}|_{3,})$/;
export const MARKDOWN_HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;
export const MARKDOWN_UNORDERED_LIST_ITEM_PATTERN = /^\s*[-*]\s+/;
export const MARKDOWN_ORDERED_LIST_ITEM_PATTERN = /^\s*\d+\.\s+/;
export const MARKDOWN_BLOCKQUOTE_LINE_PATTERN = /^\s*&gt;\s?/;
export const MARKDOWN_INLINE_CODE_PATTERN = /`([^`]+)`/g;
export const MARKDOWN_BOLD_ASTERISK_PATTERN = /\*\*([^*]+)\*\*/g;
export const MARKDOWN_BOLD_UNDERSCORE_PATTERN = /__([^_]+)__/g;
export const MARKDOWN_ITALIC_ASTERISK_PATTERN = /\*([^*]+)\*/g;
export const MARKDOWN_ITALIC_UNDERSCORE_PATTERN = /_([^_]+)_/g;
export const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g;
export const HTTP_PROTOCOL_PATTERN = /^https?:/i;
export const HTTP_OR_HTTPS_URL_PATTERN = /^https?:\/\//i;
export const AMPERSAND_PATTERN = /&/g;
export const LESS_THAN_PATTERN = /</g;
export const GREATER_THAN_PATTERN = />/g;
export const DOUBLE_QUOTE_PATTERN = /"/g;
