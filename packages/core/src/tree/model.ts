import type { PartialDate } from '../dates.ts';
import type { ChildKind, Gender, IntegrityError, ParentRole } from '../integrity.ts';

export type Region = 'north' | 'central' | 'south';

export type TreeMeta = { id: string; name: string; description?: string; region: Region };

/** Phần tử bị gỡ chỉ được đánh dấu `removedAt`, không xoá (xem design D2). */
type Removable = { removedAt?: string; removalId?: string };

export type TreePerson = Removable & {
  id: string;
  fullName: string;
  gender: Gender;
  isOutsider: boolean;
  isRoot: boolean;
  birth?: PartialDate;
  death?: PartialDate;
  birthPlace?: string;
  burialPlace?: string;
  biography?: string;
  note?: string;
  siblingOrder: number;
};

export type TreeParentLink = Removable & { parentId: string; childId: string; role: ParentRole; kind: ChildKind };

/** `wifeOrder` là thứ tự của vợ/chồng này trong các hôn nhân của người trong họ (cột `wife_order`). */
export type TreeMarriage = Removable & { id: string; husbandId: string; wifeId: string; wifeOrder: number };

export type TreeDoc = {
  version: 1;
  meta: TreeMeta;
  persons: TreePerson[];
  parents: TreeParentLink[];
  marriages: TreeMarriage[];
};

export type EditError =
  | IntegrityError
  | 'MISSING_NAME'
  | 'MISSING_GENDER'
  | 'MISSING_ROLE'
  | 'TREE_NOT_EMPTY'
  | 'ROOT_LOCKED'
  | 'HAS_CHILDREN'
  | 'SPOUSE_LIMIT'
  | 'OUTSIDER_CANNOT_PARENT'
  | 'NOT_SPOUSE'
  | 'OTHER_PARENT_REQUIRED'
  | 'NO_PARENT'
  | 'ALREADY_HAS_PARENT'
  | 'PARENT_ALREADY_MARRIED'
  | 'GENDER_UNKNOWN'
  | 'INVALID_DATE'
  | 'INVALID_ORDER'
  | 'NOT_FOUND';

export type Fail = { ok: false; error: EditError };
export type Result<T extends object = object> = ({ ok: true; doc: TreeDoc } & T) | Fail;

export const fail = (error: EditError): Fail => ({ ok: false, error });

export type NewId = () => string;
