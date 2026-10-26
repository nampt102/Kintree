import type { EditError } from '@kintree/core'

export type StoreError = 'CORRUPT' | 'UNSUPPORTED_VERSION' | 'STORAGE_FULL'
export type AppError = EditError | StoreError

/** Bảng dịch mã lỗi duy nhất của giao diện; kiểu `Record` buộc phải có câu cho mọi mã. */
export const MESSAGES: Record<AppError, string> = {
  MISSING_KIND: 'Chưa chọn loại quan hệ (ruột, nuôi hoặc riêng).',
  UNKNOWN_PERSON: 'Không tìm thấy người này (có thể đã bị gỡ).',
  NOT_FOUND: 'Không tìm thấy người này (có thể đã bị gỡ).',
  DIFFERENT_TREE: 'Hai người thuộc hai cuốn gia phả khác nhau.',
  ROLE_GENDER_MISMATCH: 'Giới tính không khớp vai trò cha/mẹ hoặc vợ/chồng.',
  DUPLICATE_PARENT: 'Người này đã có cha (hoặc mẹ) cùng loại quan hệ.',
  BOTH_OUTSIDERS: 'Quan hệ này phải có ít nhất một người trong họ.',
  CYCLE: 'Quan hệ này sẽ khiến một người trở thành tổ tiên của chính mình.',
  MISSING_NAME: 'Vui lòng nhập tên.',
  MISSING_GENDER: 'Vui lòng chọn giới tính.',
  MISSING_ROLE: 'Giới tính của người này chưa rõ, hãy chọn là cha hay mẹ.',
  TREE_NOT_EMPTY: 'Cuốn gia phả này đã có người.',
  ROOT_LOCKED: 'Thuỷ tổ và vợ/chồng thuỷ tổ không thêm được cha mẹ, và thuỷ tổ không gỡ được.',
  HAS_CHILDREN: 'Người này đang có con. Hãy gỡ các con trước, hoặc gỡ cả nhánh.',
  SPOUSE_LIMIT: 'Dâu/rể chỉ có một vợ/chồng trong cuốn gia phả.',
  OUTSIDER_CANNOT_PARENT: 'Dâu/rể không tự thêm con. Hãy thêm con từ vợ/chồng là người trong họ.',
  NOT_SPOUSE: 'Người được chọn không phải vợ/chồng của người này.',
  OTHER_PARENT_REQUIRED: 'Hãy chọn cha/mẹ còn lại của người con.',
  NO_PARENT: 'Người này chưa có cha mẹ nào để thêm người còn thiếu.',
  ALREADY_HAS_PARENT: 'Người này đã đủ cha và mẹ.',
  PARENT_ALREADY_MARRIED: 'Cha/mẹ hiện có đã có vợ/chồng; hãy thêm con từ cặp ấy.',
  GENDER_UNKNOWN: 'Hãy ghi giới tính của người này trước khi thêm vợ/chồng.',
  INVALID_DATE: 'Ngày tháng không hợp lệ.',
  INVALID_ORDER: 'Thứ tự không khớp với danh sách người hiện có.',
  CORRUPT: 'Dữ liệu lưu trên máy không đọc được. Dữ liệu cũ vẫn được giữ nguyên; hãy tải bản sao.',
  UNSUPPORTED_VERSION: 'Dữ liệu được lưu bởi một phiên bản mới hơn của ứng dụng.',
  STORAGE_FULL: 'Bộ nhớ của trình duyệt đã đầy, chưa lưu được. Hãy tải bản sao rồi xoá bớt dữ liệu.',
}

export const messageFor = (error: AppError): string => MESSAGES[error]
