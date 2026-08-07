# backend/physics_engine.py
import math
import numpy as np
from scipy.optimize import fsolve

# --- 預設物理常數 ---
AIR_DENSITY = 1.2  # ρ (kg/m³) 空氣密度
DEFAULT_ROUGHNESS = 0.15  # ε (mm) 預設粗糙度

# --- 內建 ASHRAE 局部阻力係數 (K/C-factor) 字典庫 ---
# 未來可將此字典移至 PostgreSQL 資料庫作動態擴充
ASHRAE_FITTINGS = {
    "CR9-4": 0.18,  # Damper
    "SR4-1": 0.89,  # Transition
    "SILENCER_DEFAULT": 0.0,  # Use fixed Pa loss in exporter / frontend
    "FLEX_DEFAULT": 0.0,
    "GRILLE": 15.0,
}

def calculate_velocity_pressure(velocity: float) -> float:
    """計算動壓 (Velocity Pressure): 0.5 * ρ * V^2"""
    return 0.5 * AIR_DENSITY * (velocity ** 2)

def calculate_hydraulic_diameter(a: float, b: float) -> float:
    """計算水力直徑 (Hydraulic Diameter) 單位: mm
       公式: D = 1.30 * (a*b)^0.625 / (a+b)^0.25
    """
    if a <= 0 or b <= 0:
        return 0.0
    return 1.30 * ((a * b) ** 0.625) / ((a + b) ** 0.25)

def calculate_reynolds_number(D: float, V: float) -> float:
    """計算雷諾數 (Reynolds Number)
       依據 Excel 模板特化公式: Re = 66.4 * D * V
    """
    return 66.4 * D * V

def solve_colebrook(epsilon: float, D: float, Re: float) -> float:
    """使用數值方法求解 Colebrook 方程式得到摩擦係數 (f)
       公式: 1/√f = -2 * log10( ε/(3.7*D) + 2.51/(Re*√f) )
    """
    if Re == 0 or D == 0:
        return 0.0
        
    def colebrook_eq(f):
        # 移項為 f(x) = 0 形式求解
        return (1.0 / np.sqrt(f)) + 2.0 * np.log10((epsilon / (3.7 * D)) + (2.51 / (Re * np.sqrt(f))))
    
    # 給定一個初始猜測值 f_guess (通常亂流區約在 0.02 左右)
    f_guess = 0.02
    try:
        f_solution = fsolve(colebrook_eq, f_guess)[0]
        return float(f_solution)
    except:
        return 0.02 # 求解失敗的備用預設值

def calculate_duct_section(a_mm: float, b_mm: float, length_m: float, flow_rate_m3s: float, fitting_code: str = None) -> dict:
    """
    計算單一風管區段 (Sectiobn) 的所有壓降參數
    回傳完整的 Dictionary 供生成 Excel 使用
    """
    if a_mm == 0 or b_mm == 0:
        return {"error": "Dimensions cannot be zero"}

    # 1. 換算截面積 (m²) 與 風速 (m/s)
    area_m2 = (a_mm / 1000.0) * (b_mm / 1000.0)
    velocity = flow_rate_m3s / area_m2
    
    # 2. 計算水力直徑 (D) 與 雷諾數 (Re)
    D = calculate_hydraulic_diameter(a_mm, b_mm)
    Re = calculate_reynolds_number(D, velocity)
    
    # 3. 計算摩擦係數 (f) 與 動壓
    f = solve_colebrook(DEFAULT_ROUGHNESS, D, Re)
    vel_pressure = calculate_velocity_pressure(velocity)
    
    # 4. 沿程摩擦壓降 (Friction Loss)
    # Darcy Equation: Δpf = (1000*f*L/D) * (ρV^2/2)
    # 若為純配件 (長度為 0)，則此項為 0
    friction_loss = 0.0
    if length_m > 0 and D > 0:
        friction_loss = (1000.0 * f * length_m / D) * vel_pressure

    # 5. 局部阻力壓降 (Fitting Loss)
    fitting_loss = 0.0
    c_coefficient = 0.0
    if fitting_code and fitting_code in ASHRAE_FITTINGS:
        c_coefficient = ASHRAE_FITTINGS[fitting_code]
        fitting_loss = c_coefficient * vel_pressure

    return {
        "D_mm": round(D, 0),
        "Re": round(Re, 0),
        "f": round(f, 4),
        "velocity_ms": round(velocity, 2),
        "velocity_pressure_pa": round(vel_pressure, 2),
        "friction_loss_pa": round(friction_loss, 2),
        "c_coefficient": c_coefficient,
        "fitting_loss_pa": round(fitting_loss, 2),
        "total_pressure_loss_pa": round(friction_loss + fitting_loss, 2)
    }