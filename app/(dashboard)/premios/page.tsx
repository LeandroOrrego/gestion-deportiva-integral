import GeneradorPremios from "./GeneradorPremios";

export const metadata = {
    title: "Generación de Premios | Gestión Deportiva",
    description: "Generación masiva de premios por partido para atletas.",
};

export default function PremiosPage() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-brand-primary">Generación Masiva de Premios</h1>
                <p className="text-muted-foreground">
                    Cargá premios para múltiples jugadores de un plantel basándote en los resultados del partido y sus contratos.
                </p>
            </div>
            
            <GeneradorPremios />
        </div>
    );
}
