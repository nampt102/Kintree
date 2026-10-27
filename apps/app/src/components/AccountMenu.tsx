import { LogOut, UserRound } from 'lucide-react'
import { useAuth } from '../auth.tsx'
import { IconButton, OverflowMenu } from '../ui/index.ts'

/** Menu tài khoản: cho biết email đang đăng nhập và có nút đăng xuất (spec "Hiện người đang đăng nhập"). */
export function AccountMenu({ email }: { email: string }) {
  const { signOut } = useAuth()
  return (
    <OverflowMenu
      trigger={(p) => <IconButton icon={UserRound} label="Tài khoản" {...p} />}
      items={[
        { label: email, onSelect: () => {} },
        { label: 'Đăng xuất', icon: LogOut, onSelect: () => void signOut() },
      ]}
    />
  )
}
