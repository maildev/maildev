import { EmailList } from '../email-list/EmailList'
import { SearchInput } from '../email-list/SearchInput'
import { useEmails } from '../../hooks/useEmails'

export function Sidebar() {
  const { data: emails } = useEmails()
  const unreadCount = emails?.filter((e) => !e.read).length ?? 0

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[hsl(var(--border))] p-3">
        <SearchInput />
        {emails && emails.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <span>{emails.length} email{emails.length !== 1 ? 's' : ''}</span>
            {unreadCount > 0 && (
              <>
                <span>&bull;</span>
                <span className="font-medium text-[hsl(var(--primary))]">
                  {unreadCount} unread
                </span>
              </>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <EmailList />
      </div>
    </div>
  )
}
