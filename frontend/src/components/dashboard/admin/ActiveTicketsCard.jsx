import {
  TICKET_BADGE_BG,
  TICKET_BADGE_LABEL,
  TICKET_STATUS_CHART,
} from "../../../constants/ticketStatusTheme.js";

function StatusPill({ status }) {
  const key = String(status || "").toLowerCase();
  if (key === "pending") {
    return (
      <span
        className="inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:text-[11px]"
        style={{
          backgroundColor: TICKET_BADGE_BG.pending,
          color: TICKET_BADGE_LABEL.pending,
        }}
      >
        Pending
      </span>
    );
  }
  if (key === "unassigned") {
    return (
      <span
        className="inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:text-[11px]"
        style={{
          backgroundColor: TICKET_BADGE_BG.unassigned,
          color: TICKET_BADGE_LABEL.unassigned,
        }}
      >
        Unassigned
      </span>
    );
  }
  if (key === "resolved") {
    return (
      <span
        className="inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:text-[11px]"
        style={{
          backgroundColor: TICKET_BADGE_BG.resolved,
          color: TICKET_BADGE_LABEL.resolved,
        }}
      >
        Resolved
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-semibold text-[#475569] sm:px-2.5 sm:text-[11px]">
      {status}
    </span>
  );
}

function countByStatus(items) {
  return items.reduce(
    (acc, t) => {
      const k = String(t.status || "").toLowerCase();
      if (k === "pending") acc.pending += 1;
      else if (k === "unassigned") acc.unassigned += 1;
      else if (k === "resolved") acc.resolved += 1;
      return acc;
    },
    { pending: 0, unassigned: 0, resolved: 0 },
  );
}

const cardShell =
  "flex h-full min-h-0 w-full min-w-0 flex-col rounded-xl border border-[#F3F4F6] bg-white p-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.04)] sm:p-4";

export default function ActiveTicketsCard({ items }) {
  const { pending, unassigned, resolved } = countByStatus(items);

  return (
    <div className={cardShell}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 sm:mb-3">
        <h3 className="text-[14px] font-bold text-[#111827] sm:text-[15px]">
          All active tickets
        </h3>
        <div className="flex gap-3 text-[11px] font-medium sm:text-[12px]">
          <span style={{ color: TICKET_STATUS_CHART.pending }} title="Pending">
            ● {pending}
          </span>
          <span
            style={{ color: TICKET_STATUS_CHART.unassigned }}
            title="Unassigned"
          >
            ● {unassigned}
          </span>
          <span
            style={{ color: TICKET_STATUS_CHART.resolved }}
            title="Resolved"
          >
            ● {resolved}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full table-fixed border-collapse text-left text-[12px] sm:text-[13px]">
          <colgroup>
            <col className="w-[110px] sm:w-[120px]" />
            <col />
            <col className="w-[120px] sm:w-[140px]" />
            <col className="w-[100px] sm:w-[112px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[#F3F4F6] bg-[#FAFBFC] text-[11px] font-semibold uppercase tracking-wide text-[#64748B] sm:text-[12px]">
              <th className="px-2 py-3 pl-3 sm:px-3 sm:pl-4">Date</th>
              <th className="px-2 py-3 sm:px-3">Ticket desc.</th>
              <th className="px-2 py-3 sm:px-3">Assigned team</th>
              <th className="px-2 py-3 pr-3 text-right sm:px-3 sm:pr-4">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {items.map((ticket) => (
              <tr
                key={ticket.id}
                className="bg-white transition-colors hover:bg-[#FAFBFC]/90"
              >
                <td className="whitespace-nowrap px-2 py-3 align-middle pl-3 text-[#64748B] sm:px-3 sm:pl-4">
                  {ticket.date}
                </td>
                <td className="max-w-0 px-2 py-3 align-middle font-medium text-[#111827] sm:px-3">
                  <span className="block truncate" title={ticket.description}>
                    {ticket.description}
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 py-3 align-middle text-[#374151] sm:px-3">
                  {ticket.team}
                </td>
                <td className="px-2 py-3 pr-3 text-right align-middle sm:px-3 sm:pr-4">
                  <div className="flex justify-end">
                    <StatusPill status={ticket.status} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
