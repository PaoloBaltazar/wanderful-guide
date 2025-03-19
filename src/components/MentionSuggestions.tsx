
import React from "react";
import { User } from "lucide-react";

interface Employee {
  name: string;
  email: string;
}

interface MentionSuggestionsProps {
  employees: Employee[];
  query: string;
  onSelect: (employee: Employee) => void;
  visible: boolean;
}

const MentionSuggestions = ({ employees, query, onSelect, visible }: MentionSuggestionsProps) => {
  if (!visible) return null;

  // Filter employees based on query
  const filteredEmployees = employees.filter(employee => 
    employee.name.toLowerCase().includes(query.toLowerCase()) || 
    employee.email.toLowerCase().includes(query.toLowerCase())
  );

  if (filteredEmployees.length === 0) {
    return (
      <div className="absolute z-50 w-72 mt-1 bg-white border rounded-md shadow-lg p-2">
        <div className="text-sm text-muted-foreground p-2">No employees found</div>
      </div>
    );
  }

  return (
    <div className="absolute z-50 w-72 mt-1 bg-white border rounded-md shadow-lg">
      <div className="py-1">
        <div className="px-2 py-1 text-xs text-muted-foreground">Suggestions</div>
        {filteredEmployees.map((employee) => (
          <div 
            key={employee.email}
            onClick={() => onSelect(employee)}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-100"
          >
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{employee.name}</span>
            <span className="text-xs text-muted-foreground">({employee.email})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MentionSuggestions;
