"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EntityFilterProps {
  entities: any[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

const normalize = (s: string) => 
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function EntityFilter({ 
  entities = [], 
  value, 
  onChange,
  placeholder = "Todas las entidades..." 
}: EntityFilterProps) {
  const [open, setOpen] = React.useState(false);

  const selectedEntity = value !== 'all' && value !== '' 
    ? entities.find((entity) => String(entity.id) === String(value)) 
    : null;

  return (
    <div className="flex items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between text-left font-normal"
          >
            <span className="truncate">
              {selectedEntity ? selectedEntity.nombre : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command
            filter={(val, search) => {
              if (normalize(val).includes(normalize(search))) return 1;
              return 0;
            }}
          >
            <CommandInput placeholder="Buscar por entidad..." />
            <CommandList>
              <CommandEmpty>No se encontró ninguna entidad.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all"
                  onSelect={() => {
                    onChange("all");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === "all" || value === "" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Todas
                </CommandItem>
                {entities.map((entity) => (
                  <CommandItem
                    key={entity.id}
                    value={entity.nombre}
                    onSelect={() => {
                      onChange(entity.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === entity.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {entity.nombre}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {(value !== 'all' && value !== '') && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => onChange('all')}
          title="Limpiar selección"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
