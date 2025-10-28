export interface CleanedLead {
    fullName: string;
    email: string;
    phoneNumber: string;
    city: string;
    state: string;
    country: string;
    course: string;
    leadType: string;
}

export interface Salesperson {
    id: number;
    name: string;
    email: string;
    locations: string[]; // States or countries
}

export interface AssignedLead extends CleanedLead {
    assignedTo: string;
    assignedToEmail: string;
}

export interface ChartData {
    label: string;
    value: number;
    isClickable?: boolean;
}