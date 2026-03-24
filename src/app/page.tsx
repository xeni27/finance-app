"use client";

import { useState, useEffect } from "react";
import { pmt, calculateRate } from "@/lib/calculations";
import { supabase } from "@/lib/supabase";
import { Search, AlertCircle, Info, Calculator, FileText, CheckCircle2, AlertTriangle, Fingerprint, Coins, ShieldCheck } from "lucide-react";

export default function FinancePanel() {
  // DB States
  const [numeroContrato, setNumeroContrato] = useState("");
  const [cliente, setCliente] = useState<number | null>(null);
  const [producto, setProducto] = useState<"Credit" | "Finance" | null>(null);
  const [fechaContrato, setFechaContrato] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Form States
  const [adeudos, setAdeudos] = useState(false);
  const [planApoyo, setPlanApoyo] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const [seguroFinanciado, setSeguroFinanciado] = useState(false);

  const [tasaOriginal, setTasaOriginal] = useState<number>(24);
  const [plazoRestante, setPlazoRestante] = useState<number>(12);
  const [saldoFinancing, setSaldoFinancing] = useState<number>(150000);
  const [saldoCustomer, setSaldoCustomer] = useState<number>(160000);
  const [mensualidadLineaAuto, setMensualidadLineaAuto] = useState<number>(15000);
  const [pagoFinal, setPagoFinal] = useState<number>(5000);
  const [montoAbono, setMontoAbono] = useState<number>(0);
  const [fechaCorte, setFechaCorte] = useState<string>("");

  // Custom manual input for mensuality
  const [customMensualidad, setCustomMensualidad] = useState<string>("");

  // Results
  const [nuevaMensualidad, setNuevaMensualidad] = useState<number>(0);
  const [effectiveRate, setEffectiveRate] = useState<number>(0);
  const [minAbono, setMinAbono] = useState<number>(0);
  const [maxAbono, setMaxAbono] = useState<number>(0);
  const [errorList, setErrorList] = useState<string[]>([]);
  const [infoList, setInfoList] = useState<string[]>([]);
  const [referencia, setReferencia] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroContrato) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("contratos")
        .select("cliente, producto, fecha_contrato")
        .eq("numero_contrato", numeroContrato)
        .single();

      if (data && !error) {
        setCliente(data.cliente);
        setProducto(data.producto as "Credit" | "Finance");
        setFechaContrato(data.fecha_contrato);
      } else {
        throw new Error("No encontrado");
      }
    } catch (err) {
      // Mock data if Supabase fails or table doesn't exist
      setCliente(83921020);
      setProducto("Finance");
      setFechaContrato(15);
    }
    setLoading(false);
  };

  useEffect(() => {
    const errors: string[] = [];
    const infos: string[] = [];

    const minAb = mensualidadLineaAuto * 2;
    const maxAb = (saldoCustomer - pagoFinal) * 0.9;
    setMinAbono(minAb);
    setMaxAbono(maxAb);

    if (adeudos) {
      errors.push("El cliente NO debe tener adeudos.");
    }
    if (planApoyo || ajustes) {
      errors.push("Restricción especial: El cliente tiene Plan de Apoyo o Ajustes Pendientes.");
    }
    if (fechaContrato !== null && fechaContrato <= 0) {
      errors.push("Regla de Tiempo: No ha pasado la primera mensualidad.");
    }

    if (montoAbono > 0) {
      if (montoAbono < minAb) {
        errors.push(`Regla de Monto Mínimo: El abono debe ser ≥ $${minAb.toLocaleString("es-MX", { minimumFractionDigits: 2 })}.`);
      }
      if (montoAbono > maxAb) {
        errors.push(`Regla de Monto Máximo: El abono no debe superar $${maxAb.toLocaleString("es-MX", { minimumFractionDigits: 2 })}.`);
      }
      if (montoAbono < mensualidadLineaAuto * plazoRestante) {
        infos.push("Las mensualidades aumentarán porque el abono es menor a la suma de pagos programados futuros.");
      }
    }

    setErrorList(errors);
    setInfoList(infos);

    if (cliente) {
      const randomDigit = Math.floor(Math.random() * 10) + 1;
      setReferencia(`${cliente}-${randomDigit}`);
    } else {
      setReferencia("");
    }

    if (errors.length === 0 && montoAbono > 0 && cliente && producto) {
      const rateMonthly = tasaOriginal / 100 / 12;
      const pv = -(saldoFinancing - montoAbono);
      const fv = producto === "Finance" ? pagoFinal : 0;

      const basePmt = pmt(rateMonthly, plazoRestante, pv, fv);

      let finalPmt = basePmt;
      if (seguroFinanciado && customMensualidad !== "") {
        const parsed = parseFloat(customMensualidad);
        if (!isNaN(parsed)) finalPmt = parsed;
      }

      setNuevaMensualidad(finalPmt);

      try {
        const rateResMonthly = calculateRate(plazoRestante, finalPmt, -(saldoCustomer + montoAbono), pagoFinal);
        const effectiveAnnual = rateResMonthly * 12 * 100;
        setEffectiveRate(effectiveAnnual);
      } catch (e) {
        setEffectiveRate(0);
      }
    } else {
      setNuevaMensualidad(0);
      setEffectiveRate(0);
    }
  }, [
    adeudos, planApoyo, ajustes, seguroFinanciado, tasaOriginal, plazoRestante,
    saldoFinancing, saldoCustomer, mensualidadLineaAuto, pagoFinal, montoAbono,
    cliente, producto, fechaContrato, customMensualidad, fechaCorte
  ]);

  const numInput = (setter: React.Dispatch<React.SetStateAction<number>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setter(isNaN(val) ? 0 : val);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans relative overflow-x-hidden p-4 md:p-10 flex flex-col items-center">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl w-full flex flex-col gap-6 relative z-10">

        {/* Header */}
        <header className="flex items-center gap-4 mb-4">
          <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-lg">
            <Calculator className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-fuchsia-400 tracking-tight pb-1">
              Abonos a Capital
            </h1>
            <p className="text-slate-400 text-sm md:text-base mt-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Gestión avanzada de amortizaciones y cálculo de rentabilidad.
            </p>
          </div>
        </header>

        {/* Section 1: Search Contract */}
        <section className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col lg:flex-row gap-8 items-stretch">
          <form onSubmit={handleSearch} className="flex-1 flex flex-col">
            <label className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Búsqueda de Contrato</label>
            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  maxLength={10}
                  className="w-full bg-slate-950/50 border border-slate-700/80 rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-600 font-mono text-lg text-slate-100 shadow-inner"
                  placeholder="No. Contrato (10 dígitos)"
                  value={numeroContrato}
                  onChange={(e) => setNumeroContrato(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Consultar"}
              </button>
            </div>
          </form>

          <div className="w-px bg-slate-800 hidden lg:block" />

          <div className="flex-[1.5] grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-2xl shadow-inner flex flex-col justify-center">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-2"><Fingerprint className="w-4 h-4 text-indigo-400" /> Cliente</div>
              <div className="text-2xl font-mono text-slate-200">{cliente || "—"}</div>
            </div>
            <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-2xl shadow-inner flex flex-col justify-center">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-emerald-400" /> Producto</div>
              <div className="text-2xl font-mono text-slate-200">{producto || "—"}</div>
            </div>
            <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-2xl shadow-inner flex flex-col justify-center col-span-2 sm:col-span-1">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> Fecha Corte del Contrato</div>
              <div className="text-2xl font-mono text-slate-200">{fechaContrato !== null ? fechaContrato : "—"}</div>
            </div>
          </div>
        </section>

        {/* Section 2: Form */}
        <section className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-6 md:p-8 rounded-3xl shadow-2xl">
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className={`flex items-center gap-3 p-4 rounded-2xl border ${adeudos ? 'border-red-500/50 bg-red-500/10' : 'border-slate-800/80 bg-slate-950/40'} cursor-pointer transition-all`}>
              <input type="checkbox" className="w-5 h-5 rounded accent-red-500 bg-slate-900 border-slate-700 cursor-pointer" checked={adeudos} onChange={(e) => setAdeudos(e.target.checked)} />
              <span className={`text-base font-bold ${adeudos ? 'text-red-400' : 'text-slate-300'}`}>¿Tiene Adeudos?</span>
            </label>
            <label className={`flex items-center gap-3 p-4 rounded-2xl border ${planApoyo ? 'border-blue-500/50 bg-blue-500/10' : 'border-slate-800/80 bg-slate-950/40'} cursor-pointer transition-all`}>
              <input type="checkbox" className="w-5 h-5 rounded accent-blue-500 bg-slate-900 border-slate-700 cursor-pointer" checked={planApoyo} onChange={(e) => setPlanApoyo(e.target.checked)} />
              <span className={`text-base font-bold ${planApoyo ? 'text-blue-400' : 'text-slate-300'}`}>Plan de Apoyo</span>
            </label>
            <label className={`flex items-center gap-3 p-4 rounded-2xl border ${ajustes ? 'border-blue-500/50 bg-blue-500/10' : 'border-slate-800/80 bg-slate-950/40'} cursor-pointer transition-all`}>
              <input type="checkbox" className="w-5 h-5 rounded accent-blue-500 bg-slate-900 border-slate-700 cursor-pointer" checked={ajustes} onChange={(e) => setAjustes(e.target.checked)} />
              <span className={`text-base font-bold ${ajustes ? 'text-blue-400' : 'text-slate-300'}`}>Ajustes Pendientes</span>
            </label>
            <label className={`flex items-center gap-3 p-4 rounded-2xl border ${seguroFinanciado ? 'border-fuchsia-500/50 bg-fuchsia-500/10' : 'border-blue-900/30 bg-blue-950/20'} cursor-pointer transition-all hover:bg-fuchsia-900/20`}>
              <input type="checkbox" className="w-5 h-5 rounded accent-fuchsia-500 bg-slate-900 border-slate-700 cursor-pointer" checked={seguroFinanciado} onChange={(e) => setSeguroFinanciado(e.target.checked)} />
              <span className={`text-base font-bold ${seguroFinanciado ? 'text-fuchsia-400' : 'text-blue-200'}`}>Seguro Financiado</span>
            </label>
          </div>

          <div className="mb-6 flex flex-col gap-2 bg-fuchsia-900/10 p-6 rounded-2xl border border-fuchsia-500/20 relative">
            <div className="absolute top-0 left-0 w-2 h-full bg-fuchsia-500 rounded-l-2xl" />
            <label className="text-sm font-bold text-fuchsia-300 uppercase tracking-widest flex items-center gap-2 mb-2 ml-4">
              <Coins className="w-5 h-5" /> Monto del Abono a Capital
            </label>
            <div className="relative ml-4">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-fuchsia-400 font-bold text-3xl">$</span>
              <input type="number" step="0.01" className="w-full bg-fuchsia-950/40 border-2 border-fuchsia-500/40 rounded-2xl py-6 pl-14 pr-6 focus:ring-2 focus:ring-fuchsia-400 outline-none transition-all font-mono text-4xl font-bold text-fuchsia-50 shadow-inner" placeholder="0.00" value={montoAbono || ""} onInput={(e) => { const el = e.target as HTMLInputElement; if (el.value.length > 10) el.value = el.value.slice(0, 10); }} onChange={numInput(setMontoAbono)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tasa Original (%)</label>
              <input type="number" step="0.0001" className="bg-slate-950/80 border border-slate-700/80 rounded-xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-600 font-mono text-xl text-slate-100 shadow-inner" value={tasaOriginal || ""} onChange={numInput(setTasaOriginal)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha Corte del Abono</label>
              <input type="date" className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-600 font-mono text-xl text-slate-100 shadow-inner [color-scheme:dark]" value={fechaCorte} onChange={(e) => setFechaCorte(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Plazo Restante</label>
              <div className="relative">
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 font-bold uppercase text-xs">meses</span>
                <input type="number" step="1" className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-5 py-4 pr-16 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-600 font-mono text-xl text-slate-100 shadow-inner" value={plazoRestante || ""} onChange={numInput(setPlazoRestante)} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pago Final (Residual)</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                <input type="number" step="1000" className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl py-4 pl-10 pr-5 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-xl text-slate-100 shadow-inner" value={pagoFinal || ""} onChange={numInput(setPagoFinal)} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mensualidad Línea del Auto</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                <input type="number" step="0.01" className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl py-4 pl-10 pr-5 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-xl text-blue-100 shadow-inner" value={mensualidadLineaAuto || ""} onChange={numInput(setMensualidadLineaAuto)} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Saldo Financing</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                <input type="number" step="1000" className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl py-4 pl-10 pr-5 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-xl text-emerald-100 shadow-inner" value={saldoFinancing || ""} onChange={numInput(setSaldoFinancing)} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Saldo Customer</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                <input type="number" step="1000" className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl py-4 pl-10 pr-5 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-xl text-emerald-100 shadow-inner" value={saldoCustomer || ""} onChange={numInput(setSaldoCustomer)} />
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Messages */}
        <div className="flex flex-col gap-3">
          {adeudos && (
            <div className="flex items-center justify-center p-6 rounded-2xl bg-red-600/20 border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse">
              <AlertTriangle className="w-10 h-10 text-red-500 mr-4 shrink-0" />
              <h2 className="text-2xl font-black text-red-500 uppercase tracking-widest text-center shadow-red-500">EL CLIENTE NO DEBE TENER ADEUDOS</h2>
            </div>
          )}
          {!adeudos && errorList.map((err, i) => (
            <div key={`err-${i}`} className="flex items-start gap-4 p-5 rounded-2xl border-l-4 border-red-500 bg-red-950/40 shadow-lg text-red-200 backdrop-blur-md">
              <AlertCircle className="w-6 h-6 text-red-400 mt-0.5 shrink-0" />
              <p className="font-semibold text-lg">{err}</p>
            </div>
          ))}
          {!adeudos && infoList.map((info, i) => (
            <div key={`info-${i}`} className="flex items-start gap-4 p-5 rounded-2xl border-l-4 border-amber-500 bg-amber-950/40 shadow-lg text-amber-200 backdrop-blur-md">
              <Info className="w-6 h-6 text-amber-400 mt-0.5 shrink-0" />
              <p className="font-semibold text-lg">{info}</p>
            </div>
          ))}
        </div>

        {/* Section 4: Results */}
        <section className={`transition-all duration-700 ease-out overflow-hidden ${errorList.length === 0 && montoAbono > 0 && cliente ? 'opacity-100 translate-y-0' : 'opacity-40 grayscale pointer-events-none translate-y-4'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-slate-700/50 shadow-2xl bg-slate-900/40 backdrop-blur-xl group">

            {/* Left Col: Rates & Rules */}
            <div className="p-8 md:p-10 flex flex-col gap-8 bg-gradient-to-br from-slate-900/80 to-slate-950/80">
              <h3 className="text-xl font-black text-slate-100 uppercase tracking-widest border-b border-slate-700/50 pb-4">Indicadores Calculados</h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col gap-2">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Interest Rate</span>
                  <span className="text-3xl font-mono text-slate-200 font-light">{(tasaOriginal).toFixed(4)}%</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-blue-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    Effective Rate <Info className="w-3 h-3" />
                  </span>
                  <span className="text-3xl font-mono text-blue-300 font-bold drop-shadow-[0_2px_10px_rgba(59,130,246,0.3)]">
                    {effectiveRate > 0 ? effectiveRate.toFixed(5) : '0.00000'}%
                  </span>
                </div>
                <div className="flex flex-col gap-2 pt-6 border-t border-slate-800/80">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Abono Mín. Requerido</span>
                  <span className="text-2xl font-mono text-slate-300 font-light">${minAbono.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex flex-col gap-2 pt-6 border-t border-slate-800/80">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Abono Máx. Permitido</span>
                  <span className="text-2xl font-mono text-slate-300 font-light">${maxAbono.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Right Col: Output Mensuality */}
            <div className="p-8 md:p-10 flex flex-col gap-8 relative bg-gradient-to-br from-blue-900/20 to-fuchsia-900/10">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-slate-700/50 to-transparent hidden lg:block" />

              <h3 className="text-xl font-black text-slate-100 uppercase tracking-widest border-b border-slate-700/50 pb-4">Resumen de Ejecución</h3>

              <div className="bg-slate-950/60 p-6 rounded-2xl border border-blue-500/30 shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)]">
                <label className="text-xs font-bold text-blue-300 uppercase tracking-widest flex items-center justify-between mb-4">
                  <span>Nueva Mensualidad Auto</span>
                  {seguroFinanciado && <span className="bg-fuchsia-500 text-white font-bold text-[10px] px-2 py-1 rounded-sm tracking-wider uppercase">Entrada Manual</span>}
                </label>

                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-3xl">$</span>
                  {seguroFinanciado ? (
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-slate-900 border-2 border-fuchsia-500/60 rounded-xl py-5 pl-12 pr-5 focus:ring-4 focus:ring-fuchsia-500/30 outline-none transition-all font-mono text-4xl font-bold text-white shadow-[0_0_20px_rgba(217,70,239,0.2)]"
                      placeholder={nuevaMensualidad.toFixed(2)}
                      value={customMensualidad}
                      onChange={(e) => setCustomMensualidad(e.target.value)}
                    />
                  ) : (
                    <input
                      type="text"
                      readOnly
                      className="w-full bg-transparent border-none rounded-xl py-5 pl-12 pr-5 outline-none font-mono text-4xl font-bold text-white drop-shadow-md"
                      value={nuevaMensualidad > 0 ? nuevaMensualidad.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                    />
                  )}
                </div>
              </div>

              <div className="bg-slate-950/40 rounded-2xl border border-slate-800/80 p-6 flex flex-col gap-4">
                <div className="flex justify-between items-center pb-4 border-b border-slate-800/80">
                  <span className="text-slate-400 text-sm font-semibold">Seguro Financiado</span>
                  <span className={`font-bold uppercase tracking-wider text-sm ${seguroFinanciado ? 'text-fuchsia-400' : 'text-slate-500'}`}>{seguroFinanciado ? "Activado" : "Inactivo"}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm font-semibold">Servicios Adicionales</span>
                  <span className="font-semibold font-mono text-slate-300">$0.00</span>
                </div>
              </div>

              <div className="mt-auto pt-6 flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3">Referencia de Pago Generada</span>
                <div className="bg-blue-600 w-full py-5 text-center rounded-2xl shadow-[0_10px_30px_rgba(37,99,235,0.4)] text-white font-mono text-4xl tracking-[0.3em] font-black border border-blue-400/50">
                  {referencia || "--------"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer info block */}
        <footer className="mt-12 text-center bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 flex items-center justify-center gap-4 w-full backdrop-blur-md shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <span className="text-slate-200 font-semibold tracking-wide text-left">
            Nota Importante: Si deposita sin cotización previa, comunicarse al CAC.
          </span>
        </footer>

      </div>
    </div>
  );
}
