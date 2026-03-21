import { useState, useRef, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import { HelpCircle, BookOpen } from 'lucide-react';
import { SOP_DATA } from '@/data/sopData';

interface SOPHelperProps {
  context: string; // e.g. 'inventory', 'payroll', 'pos', 'orders', 'products', 'categories', 'staff', 'repairs', 'dashboard', 'reports', 'finance', 'timesheets'
}

// Map page contexts to relevant SOP sections and procedure titles
const CONTEXT_MAP: Record<string, { sectionId: string; procedures: string[] }[]> = {
  pos: [
    {
      sectionId: 'cashier-register',
      procedures: ['Start Shift', 'Process Sale', 'Process Refund', 'Gift Cards', 'Close Shift'],
    },
  ],
  inventory: [
    {
      sectionId: 'warehouse-inventory',
      procedures: ['Search Product', 'Count Inventory (Cycle Count)', 'Receive Stock'],
    },
  ],
  products: [
    {
      sectionId: 'admin-management',
      procedures: ['Manage Products'],
    },
    {
      sectionId: 'warehouse-inventory',
      procedures: ['Search Product'],
    },
  ],
  categories: [
    {
      sectionId: 'admin-management',
      procedures: ['Manage Categories'],
    },
  ],
  staff: [
    {
      sectionId: 'admin-management',
      procedures: ['Manage Staff'],
    },
  ],
  repairs: [
    {
      sectionId: 'admin-management',
      procedures: ['Handle Repairs'],
    },
  ],
  dashboard: [
    {
      sectionId: 'admin-management',
      procedures: ['Use Dashboard'],
    },
    {
      sectionId: 'manager-daily',
      procedures: ['Morning Check'],
    },
  ],
  orders: [
    {
      sectionId: 'cashier-register',
      procedures: ['Process Sale', 'Process Refund'],
    },
  ],
  reports: [
    {
      sectionId: 'finance-operations',
      procedures: ['Review Reports'],
    },
    {
      sectionId: 'manager-weekly',
      procedures: ['Reports Review'],
    },
  ],
  finance: [
    {
      sectionId: 'finance-operations',
      procedures: ['Approve Payroll', 'Mark Payroll Paid', 'Review Expenses'],
    },
  ],
  payroll: [
    {
      sectionId: 'finance-operations',
      procedures: ['Approve Payroll', 'Mark Payroll Paid'],
    },
    {
      sectionId: 'manager-weekly',
      procedures: ['Payroll Approval'],
    },
  ],
  timesheets: [
    {
      sectionId: 'manager-daily',
      procedures: ['Staff Check'],
    },
  ],
};

export function SOPHelper({ context }: SOPHelperProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const contextEntries = CONTEXT_MAP[context] || [];
  if (contextEntries.length === 0) return null;

  // Build the list of relevant procedure links
  const links: { title: string; role: string; href: string }[] = [];
  for (const entry of contextEntries) {
    const section = SOP_DATA.find((s) => s.id === entry.sectionId);
    if (!section) continue;
    for (const procTitle of entry.procedures) {
      links.push({
        title: procTitle,
        role: section.role,
        href: `/admin/sop?role=${section.role}&section=${encodeURIComponent(procTitle)}`,
      });
    }
  }

  // Limit to 5 links to keep the dropdown compact
  const displayLinks = links.slice(0, 5);

  return (
    <div className="fixed bottom-6 right-6 z-50 print:hidden" ref={dropdownRef}>
      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-14 right-0 w-72 bg-popover border rounded-lg shadow-lg p-3 space-y-1">
          <div className="flex items-center gap-2 mb-2 px-1">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Related Procedures</span>
          </div>
          {displayLinks.map((link, i) => (
            <Link
              key={i}
              href={link.href}
              className="flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
              onClick={() => setOpen(false)}
            >
              <span>{link.title}</span>
              <span className="text-xs text-muted-foreground capitalize">{link.role}</span>
            </Link>
          ))}
          <div className="border-t pt-2 mt-2">
            <Link
              href="/admin/sop"
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
              onClick={() => setOpen(false)}
            >
              <BookOpen className="h-3.5 w-3.5" />
              View all SOPs
            </Link>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        title="Standard Operating Procedures"
      >
        <HelpCircle className="h-5 w-5" />
      </button>
    </div>
  );
}
