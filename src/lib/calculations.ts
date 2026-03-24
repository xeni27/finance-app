/**
 * Calcula el pago mensual de un préstamo basado en pagos constantes y una tasa de interés constante.
 * Equivalente a la función PMT de Excel.
 */
export function pmt(rate: number, nper: number, pv: number, fv: number = 0, type: number = 0): number {
    if (rate === 0) return -(pv + fv) / nper;
    const pvif = Math.pow(1 + rate, nper);
    let pmtAmount = (rate * (pv * pvif + fv)) / (pvif - 1);
    if (type === 1) {
        pmtAmount /= (1 + rate);
    }
    return -pmtAmount;
}

/**
 * Calcula la tasa de interés por período de una anualidad usando el método de Newton-Raphson.
 * Equivalente a la función RATE de Excel.
 */
export function calculateRate(nper: number, pmtAmount: number, pv: number, fv: number = 0, type: number = 0, guess: number = 0.1): number {
    let rateGuess = guess;
    const maxIters = 100;
    const eps = 1e-7;
    
    // f(r) = pv * (1+r)^n + pmt * (1+r*type) * ((1+r)^n - 1)/r + fv
    const f = (r: number) => {
        if (r === 0) return pv + pmtAmount * nper + fv;
        const p1 = Math.pow(1 + r, nper);
        return pv * p1 + pmtAmount * (1 + r * type) * (p1 - 1) / r + fv;
    };

    for (let i = 0; i < maxIters; i++) {
        let y = f(rateGuess);
        let y1 = f(rateGuess + 1e-5);
        let dy = (y1 - y) / 1e-5;
        
        if (Math.abs(y) < eps) return rateGuess;
        if (Math.abs(dy) < eps) return rateGuess;
        
        rateGuess -= y / dy;
    }
    return rateGuess;
}
