import { EmailList } from '../email-list/EmailList'
import { SearchInput } from '../email-list/SearchInput'
import { useEmailList } from '../../hooks/useEmails'

export function Sidebar() {
  const { total, storeTotal, unread, isSearching } = useEmailList()

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[hsl(var(--border))] p-3">
        <SearchInput />
        {storeTotal > 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            {isSearching ? (
              <span>
                {total} of {storeTotal} email{storeTotal !== 1 ? 's' : ''}
              </span>
            ) : (
              <span>
                {storeTotal} email{storeTotal !== 1 ? 's' : ''}
              </span>
            )}
            {unread > 0 && (
              <>
                <span>&bull;</span>
                <span className="font-medium text-[hsl(var(--primary))]">
                  {unread} unread
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
