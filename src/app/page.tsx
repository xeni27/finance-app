"use client";

import { useState, useEffect } from "react";
import { pmt, calculateRate } from "@/lib/calculations";
import { supabase } from "@/lib/supabase";
import { Search, AlertCircle, Info, Calculator, FileText, CheckCircle2, AlertTriangle, Fingerprint, Coins, ShieldCheck, Calendar, DollarSign, Activity } from "lucide-react";

export default function FinancePanel() {
  // DB States
  const [numeroContrato, setNumeroContrato] = useState("");
  const [cliente, setCliente] = useState<number | null>(null);
  const [producto, setProducto] = useState<"Credit" | "Finance" | null>(null);
  const [loading, setLoading] = useState(false);

  // VLOOKUP Extracted Data
  const [fechaContrato, setFechaContrato] = useState<number | null>(null);
  const [pagoFinal, setPagoFinal] = useState<number>(5000);
  const [fechaFinContrato, setFechaFinContrato] = useState<string>("");
  const [tasaInteresSeguro, setTasaInteresSeguro] = useState<number>(0);
  const [montoFinanciadoSeguro, setMontoFinanciadoSeguro] = useState<number>(0);

  // Form States
  const [adeudos, setAdeudos] = useState(false);
  const [planApoyo, setPlanApoyo] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const [seguroFinanciadoCheck, setSeguroFinanciadoCheck] = useState(false);

  // Seccion 2: Inputs
  const [montoAbono, setMontoAbono] = useState<number>(0);
  const [fechaCorte, setFechaCorte] = useState<string>("");
  const [mensualidadTotal, setMensualidadTotal] = useState<number>(18000);
  const [mensualidadLineaAuto, setMensualidadLineaAuto] = useState<number>(15000);
  const [saldoCustomer, setSaldoCustomer] = useState<number>(160000);
  const [saldoFinancing, setSaldoFinancing] = useState<number>(150000);
  const [tasaOriginal, setTasaOriginal] = useState<number>(24);
  const [customMensualidad, setCustomMensualidad] = useState<string>("");

  // Calculated variables
  const [plazoRestanteAuto, setPlazoRestanteAuto] = useState<number>(0);
  const [nuevaMensualidadAuto, setNuevaMensualidadAuto] = useState<number>(0);
  const [serviciosAdicionales, setServiciosAdicionales] = useState<number>(0);
  const [seguroFinanciadoOutput, setSeguroFinanciadoOutput] = useState<number>(0);
  const [nuevaMensualidadTotal, setNuevaMensualidadTotal] = useState<number>(0);
  const [fechaNuevaMensualidad, setFechaNuevaMensualidad] = useState<string>("-");
  const [fechaLimitePago, setFechaLimitePago] = useState<string>("-");
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
        .select("cliente, producto, fecha_contrato, pago_final, fecha_fin_contrato, tasa_seguro, monto_seguro")
        .eq("numero_contrato", numeroContrato)
        .single();

      if (data && !error) {
        setCliente(data.cliente);
        setProducto(data.producto as "Credit" | "Finance");
        setFechaContrato(data.fecha_contrato);
        setPagoFinal(Number(data.pago_final) || 0);
        setFechaFinContrato(data.fecha_fin_contrato || "");
        setTasaInteresSeguro(Number(data.tasa_seguro) || 0);
        setMontoFinanciadoSeguro(Number(data.monto_seguro) || 0);
      } else {
        throw new Error("No encontrado");
      }
    } catch (err) {
      setCliente(83921020);
      setProducto("Finance");
      setFechaContrato(15);
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      setPagoFinal(5000);
      setFechaFinContrato(futureDate.toISOString().split('T')[0]);
      setTasaInteresSeguro(15.5);
      setMontoFinanciadoSeguro(12000);
    }
    setLoading(false);
  };

  useEffect(() => {
    const errors: string[] = [];
    const infos: string[] = [];

    // PLAZO RESTANTE
    let computedPlazo = 0;
    if (fechaCorte && fechaFinContrato) {
      const d1 = new Date(fechaCorte);
      const d2 = new Date(fechaFinContrato);
      let m = (d2.getFullYear() - d1.getFullYear()) * 12;
      m -= d1.getMonth();
      m += d2.getMonth();
      computedPlazo = m <= 0 ? 0 : m;
    }
    setPlazoRestanteAuto(computedPlazo);

    const minAb = mensualidadTotal * 2;
    const maxAb = saldoCustomer * 0.9;
    setMinAbono(minAb);
    setMaxAbono(maxAb);

    if (adeudos) errors.push("El cliente NO debe tener adeudos.");
    if (planApoyo || ajustes) errors.push("Restricción: El cliente tiene Plan de Apoyo o Ajustes Pendientes.");
    if (fechaContrato !== null && fechaContrato <= 0) errors.push("Regla de Tiempo: No ha pasado la primera mensualidad.");

    if (montoAbono > 0) {
      if (montoAbono < minAb) errors.push(`Regla de Monto Mínimo: El abono debe ser al menos el doble de la mensualidad total ($${minAb.toLocaleString("es-MX", { minimumFractionDigits: 2 })}).`);
      if (montoAbono > maxAb) errors.push(`Regla de Monto Máximo: El abono no debe superar el 90% del saldo insoluto del customer ($${maxAb.toLocaleString("es-MX", { minimumFractionDigits: 2 })}).`);
    }

    setErrorList(errors);
    setInfoList(infos);

    // REFERENCIA: digito sin guion
    if (cliente) {
      const randomDigit = Math.floor(Math.random() * 10) + 1;
      setReferencia(`${cliente}${randomDigit}`);
    } else {
      setReferencia("");
    }

    if (errors.length === 0 && montoAbono > 0 && cliente && producto && computedPlazo > 0) {
      // EXCEL: Servicios Adicionales
      const pmtSeguro = pmt(tasaInteresSeguro / 100 / 12, computedPlazo, -montoFinanciadoSeguro, 0);
      const diffServicios = mensualidadTotal - pmtSeguro - mensualidadLineaAuto;
      const servAd = diffServicios < 5 ? (pmtSeguro + diffServicios) : pmtSeguro;
      setServiciosAdicionales(servAd);

      // EXCEL: Seguro Financiado
      let seguroFin = mensualidadTotal - mensualidadLineaAuto - servAd;
      if (seguroFin === 0 || Math.abs(seguroFin) < 0.01) seguroFin = 0;
      setSeguroFinanciadoOutput(seguroFin);

      // EXCEL: Nueva Mensualidad Auto
      const roundedRate = (Math.round(tasaOriginal * 10000) / 10000) / 100 / 12;
      const pv = -(saldoFinancing - montoAbono);
      const fv = producto === "Finance" ? pagoFinal : 0;
      const basePmt = pmt(roundedRate, computedPlazo, pv, fv);

      let finalPmt = basePmt;
      if (seguroFinanciadoCheck && customMensualidad !== "") {
        const parsed = parseFloat(customMensualidad);
        if (!isNaN(parsed)) finalPmt = parsed;
      }
      setNuevaMensualidadAuto(finalPmt);

      // NUEVA MENSUALIDAD TOTAL
      setNuevaMensualidadTotal(finalPmt + seguroFin + servAd);

      // FECHAS
      if (fechaCorte) {
        const dateParts = fechaCorte.split('-').map(Number);
        const fd = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
        fd.setUTCMonth(fd.getUTCMonth() + 1);
        setFechaNuevaMensualidad(fd.toISOString().split('T')[0]);

        // Fecha límite de pago: 2 días antes de la fecha corte del abono
        const fl = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
        fl.setUTCDate(fl.getUTCDate() - 2);
        setFechaLimitePago(fl.toISOString().split('T')[0]);
      } else {
        setFechaNuevaMensualidad("-");
        setFechaLimitePago("-");
      }

    } else {
      setNuevaMensualidadAuto(0);
      setServiciosAdicionales(0);
      setSeguroFinanciadoOutput(0);
      setNuevaMensualidadTotal(0);
      setFechaNuevaMensualidad("-");
      setFechaLimitePago("-");
    }
  }, [
    adeudos, planApoyo, ajustes, seguroFinanciadoCheck, tasaOriginal,
    saldoFinancing, saldoCustomer, mensualidadLineaAuto, mensualidadTotal,
    pagoFinal, montoAbono, cliente, producto, fechaContrato, customMensualidad,
    fechaCorte, fechaFinContrato, tasaInteresSeguro, montoFinanciadoSeguro
  ]);

  // Se calcular effectiveRate por separado porque su scope es reactivo con finalPmt y plazos.
  useEffect(() => {
    if (montoAbono > 0 && plazoRestanteAuto > 0 && nuevaMensualidadTotal > 0 && errorList.length === 0) {
      try {
        const rateResMonthly = calculateRate(plazoRestanteAuto, nuevaMensualidadTotal, -(saldoCustomer + montoAbono), pagoFinal);
        const effectiveAnnual = rateResMonthly * 12 * 100;
        setEffectiveRate(effectiveAnnual);
      } catch (e) {
        setEffectiveRate(0);
      }
    } else {
      setEffectiveRate(0);
    }
  }, [nuevaMensualidadTotal, plazoRestanteAuto, saldoCustomer, montoAbono, pagoFinal, errorList.length]);

  const numInput = (setter: React.Dispatch<React.SetStateAction<number>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setter(isNaN(val) ? 0 : val);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans relative overflow-x-hidden p-6 md:p-12 flex flex-col items-center">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl w-full flex flex-col gap-8 relative z-10">

        {/* HEADER */}
        <header className="flex items-center gap-4 border-b border-slate-800/80 pb-6">
          <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-lg">
            <Calculator className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-400 tracking-tight pb-1">
              Abonos a Capital
            </h1>
          </div>
        </header>

        {/* SECTION 1: BUSQUEDA */}
        <section className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-6 md:p-8 rounded-3xl shadow-lg">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-sm font-semibold text-slate-300 mb-3 block uppercase tracking-wider">Búsqueda de Contrato</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  maxLength={10}
                  className="w-full bg-slate-950/50 border border-slate-700/80 rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-600 font-mono text-lg text-slate-100 shadow-inner"
                  placeholder="No. Contrato"
                  value={numeroContrato}
                  onChange={(e) => setNumeroContrato(e.target.value)}
                />
              </div>
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 h-14"
              disabled={loading}
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Consultar"}
            </button>
          </form>
          {cliente && (
            <div className="mt-6 flex flex-wrap gap-4 pt-4 border-t border-slate-800">
              <span className="text-sm font-bold text-slate-400">Cliente: <span className="text-indigo-300 ml-1">{cliente}</span></span>
              <span className="text-sm font-bold text-slate-400">Producto: <span className="text-emerald-300 ml-1">{producto}</span></span>
              <span className="text-sm font-bold text-slate-400">Día Corte Contrato: <span className="text-amber-300 ml-1">{fechaContrato !== null ? fechaContrato : "—"}</span></span>
            </div>
          )}
        </section>

        {/* RESTRICCIONES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className={`flex items-center gap-3 p-4 rounded-2xl border ${adeudos ? 'border-red-500/50 bg-red-500/10' : 'border-slate-800/80 bg-slate-900/40'} cursor-pointer transition-all`}>
            <input type="checkbox" className="w-5 h-5 rounded accent-red-500 bg-slate-900 border-slate-700 cursor-pointer" checked={adeudos} onChange={(e) => setAdeudos(e.target.checked)} />
            <span className={`text-sm font-bold ${adeudos ? 'text-red-400' : 'text-slate-300'}`}>¿Tiene Adeudos?</span>
          </label>
          <label className={`flex items-center gap-3 p-4 rounded-2xl border ${planApoyo ? 'border-blue-500/50 bg-blue-500/10' : 'border-slate-800/80 bg-slate-900/40'} cursor-pointer transition-all`}>
            <input type="checkbox" className="w-5 h-5 rounded accent-blue-500 bg-slate-900 border-slate-700 cursor-pointer" checked={planApoyo} onChange={(e) => setPlanApoyo(e.target.checked)} />
            <span className={`text-sm font-bold ${planApoyo ? 'text-blue-400' : 'text-slate-300'}`}>Plan de Apoyo</span>
          </label>
          <label className={`flex items-center gap-3 p-4 rounded-2xl border ${ajustes ? 'border-blue-500/50 bg-blue-500/10' : 'border-slate-800/80 bg-slate-900/40'} cursor-pointer transition-all`}>
            <input type="checkbox" className="w-5 h-5 rounded accent-blue-500 bg-slate-900 border-slate-700 cursor-pointer" checked={ajustes} onChange={(e) => setAjustes(e.target.checked)} />
            <span className={`text-sm font-bold ${ajustes ? 'text-blue-400' : 'text-slate-300'}`}>Ajustes Pendientes</span>
          </label>
          <label className={`flex items-center gap-3 p-4 rounded-2xl border ${seguroFinanciadoCheck ? 'border-blue-500/50 bg-blue-500/10' : 'border-slate-800/80 bg-slate-900/40'} cursor-pointer transition-all`}>
            <input type="checkbox" className="w-5 h-5 rounded accent-blue-500 bg-slate-900 border-slate-700 cursor-pointer" checked={seguroFinanciadoCheck} onChange={(e) => setSeguroFinanciadoCheck(e.target.checked)} />
            <span className={`text-sm font-bold ${seguroFinanciadoCheck ? 'text-blue-400' : 'text-blue-200'}`}>Editar Mensualidad Manual</span>
          </label>
        </div>

        {/* ERRORS */}
        <div className="flex flex-col gap-3">
          {adeudos && (
            <div className="flex items-center justify-center p-6 rounded-2xl bg-red-600/20 border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse">
              <h2 className="text-2xl font-black text-red-500 uppercase tracking-widest text-center">EL CLIENTE NO DEBE TENER ADEUDOS</h2>
            </div>
          )}
          {!adeudos && errorList.map((err, i) => (
            <div key={`err-${i}`} className="flex items-start gap-4 p-4 rounded-xl border-l-4 border-red-500 bg-red-950/40 text-red-200">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <p className="font-semibold text-sm">{err}</p>
            </div>
          ))}
          {!adeudos && infoList.map((info, i) => (
            <div key={`info-${i}`} className="flex items-start gap-4 p-4 rounded-xl border-l-4 border-amber-500 bg-amber-950/40 text-amber-200">
              <Info className="w-5 h-5 text-amber-400 mt-0.5" />
              <p className="font-semibold text-sm">{info}</p>
            </div>
          ))}
        </div>

        {/* SECTION 2: INPUTS MANUALES */}
        <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-6 md:p-8 rounded-3xl shadow-xl">
          <h2 className="text-lg font-black text-blue-400 uppercase tracking-widest mb-6 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Coins className="w-5 h-5" /> Inserción de Datos (Manual)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Monto a abonar</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input type="number" step="0.01" className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-8 pr-4 outline-none focus:border-blue-500 font-mono text-xl" value={montoAbono || ""} onInput={(e) => { const el = e.target as HTMLInputElement; if (el.value.length > 10) el.value = el.value.slice(0, 10); }} onChange={numInput(setMontoAbono)} />
              </div>
            </div>

            <div className="flex flex-col gap-2 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Fecha Corte del Abono</label>
              <div className="relative">
                <input type="date" min={new Date().toISOString().split('T')[0]} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 outline-none focus:border-blue-500 font-mono text-xl [color-scheme:dark]" value={fechaCorte} onChange={(e) => setFechaCorte(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-2 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Mensualidad TOTAL Contrato</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input type="number" step="0.01" className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-8 pr-4 outline-none focus:border-blue-500 font-mono text-xl" value={mensualidadTotal || ""} onChange={numInput(setMensualidadTotal)} />
              </div>
            </div>

            <div className="flex flex-col gap-2 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Mensualidad Línea del Auto</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input type="number" step="0.01" className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-8 pr-4 outline-none focus:border-blue-500 font-mono text-xl" value={mensualidadLineaAuto || ""} onChange={numInput(setMensualidadLineaAuto)} />
              </div>
            </div>

            <div className="flex flex-col gap-2 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Saldo Insoluto CUSTOMER COMPLETE</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input type="number" step="1000" className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-8 pr-4 outline-none focus:border-blue-500 font-mono text-xl" value={saldoCustomer || ""} onChange={numInput(setSaldoCustomer)} />
              </div>
            </div>

            <div className="flex flex-col gap-2 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Saldo Insoluto FINANCING COMPANY</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input type="number" step="1000" className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-8 pr-4 outline-none focus:border-blue-500 font-mono text-xl" value={saldoFinancing || ""} onChange={numInput(setSaldoFinancing)} />
              </div>
            </div>

            <div className="flex flex-col gap-2 bg-slate-950/50 p-4 rounded-2xl border border-slate-800 lg:col-span-3">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tasa de interés Original (%)</label>
              <div className="relative">
                <input type="number" step="0.0001" className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 outline-none focus:border-blue-500 font-mono text-xl" value={tasaOriginal || ""} onChange={numInput(setTasaOriginal)} />
              </div>
            </div>
          </div>
        </section>

        {/* Contenedor de Múltiples Secciones Inferiores */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 transition-opacity duration-500 ${errorList.length === 0 && montoAbono > 0 && cliente ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>

          {/* SECTION 3: RESULTADOS CALCULADOS */}
          <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-3xl shadow-xl">
            <h2 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-4 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Resultados Calculados
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Int.Rate Result-Cust</span>
                <span className="text-lg font-mono text-slate-200">{Math.round(tasaOriginal * 10000) / 10000}%</span>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">Effective Interest Rate</span>
                <span className="text-lg font-mono text-blue-300 font-bold">{effectiveRate > 0 ? effectiveRate.toFixed(5) : '0'}%</span>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Abono mínimo</span>
                <span className="text-lg font-mono text-slate-300">${minAbono.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Abono Máximo</span>
                <span className="text-lg font-mono text-slate-300">${maxAbono.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </section>

          {/* SECTION 4: DATOS CONTRATO / VLOOKUP */}
          <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-3xl shadow-xl">
            <h2 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-4 border-b border-slate-800 pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" /> Datos del Contrato (VLOOKUP)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Pago Final</span>
                <span className="text-sm font-mono text-slate-200">${pagoFinal.toLocaleString()}</span>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Fecha Fin</span>
                <span className="text-sm font-mono text-slate-200">{fechaFinContrato || "-"}</span>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Plazo Restante Auto</span>
                <span className="text-sm font-mono text-emerald-400 font-bold">{plazoRestanteAuto}</span>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Tasa Seguro</span>
                <span className="text-sm font-mono text-slate-200">{tasaInteresSeguro}%</span>
              </div>
              <div className="col-span-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Monto Financiado Seguro</span>
                <span className="text-sm font-mono text-slate-200">${montoFinanciadoSeguro.toLocaleString()}</span>
              </div>
            </div>
          </section>

          {/* SECTION 5: MENSUALIDADES Y SERVICIOS */}
          <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-3xl shadow-xl lg:col-span-2">
            <h2 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-4 border-b border-slate-800 pb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-400" /> Mensualidades y Servicios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-950/30 p-4 rounded-xl border border-blue-900/50">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">Nueva Mensualidad Auto</span>
                {seguroFinanciadoCheck ? (
                  <input type="number" step="0.01" className="w-full bg-slate-950 border border-blue-500/50 rounded-lg p-2 font-mono text-xl focus:outline-none" value={customMensualidad} onChange={(e) => setCustomMensualidad(e.target.value)} placeholder={nuevaMensualidadAuto.toFixed(2)} />
                ) : (
                  <span className="text-2xl font-mono text-white">${nuevaMensualidadAuto.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                )}
              </div>
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Seguro Financiado</span>
                <span className="text-2xl font-mono text-slate-200">${seguroFinanciadoOutput.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Servicios Adicionales</span>
                <span className="text-2xl font-mono text-slate-200">${serviciosAdicionales.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="bg-blue-950/30 p-4 rounded-xl border border-blue-900/50">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">Nueva Mensualidad TOTAL</span>
                <span className="text-2xl font-mono text-white font-bold">${nuevaMensualidadTotal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </section>

          {/* SECTION 6: FECHAS Y REFERENCIA */}
          <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-3xl shadow-xl lg:col-span-2">
            <h2 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-4 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" /> Vencimientos y Pagos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="flex flex-col gap-3">
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Fecha de N. Mensualidad</span>
                  <span className="text-sm font-mono text-slate-200">{fechaNuevaMensualidad}</span>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Fecha Límite de Pago</span>
                  <span className="text-sm font-mono text-slate-200">{fechaLimitePago}</span>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 bg-blue-600/10 border-2 border-blue-500/50 rounded-2xl p-6 flex flex-col items-center justify-center shadow-[inset_0_0_20px_rgba(37,99,235,0.2)]">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-2">Referencia de Pago</span>
                <span className="text-4xl md:text-5xl font-black font-mono tracking-[0.3em] text-white">
                  {referencia || "--------"}
                </span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
