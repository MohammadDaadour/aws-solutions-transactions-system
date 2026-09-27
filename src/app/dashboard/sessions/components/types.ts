export type Snapshot = {
    id: string;
    currency: string;
    balance: number;
    balanceStatus: string;
    user: { username: string };
};

export type Transaction = {
    id: string;
    amount: number;
    type: string;
    currency: string;
    createdAt: string;
    date: string;
    notes: string;
    user: { id: string; username: string };
    creator: { id: string; username: string };
};

export type Session = {
    id: string;
    status: "OPEN" | "CLOSING" | "CLOSED";
    openedAt: string;
    closedAt: string | null;
    notes: string | null;
    openedByUser: { username: string };
    closedByUser: { username: string } | null;
    snapshots: Snapshot[];
    _count: { transactions: number };
};
