from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import firebase_admin
from firebase_admin import credentials, db
import pandas as pd
import io
from datetime import datetime
import os

app = FastAPI()

# Configurar CORS para permitir peticiones desde Vue (localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar Firebase
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://sistemasreportes-default-rtdb.firebaseio.com'
})

@app.get("/")
def read_root():
    return {"message": "El Backend Python está funcionando 🚀"}

@app.get("/api/status")
def status():
    return {"status": "online", "service": "Reportes Backend"}

@app.get("/api/test-firebase")
def test_firebase():
    try:
        # Intentar leer 'activities' (o solo contar cuántas hay)
        ref = db.reference('activities')
        data = ref.order_by_key().limit_to_last(1).get()
        return {"success": True, "message": "Conexión Exitosa con Firebase", "data_sample": data}
    except Exception as e:
        return {"success": False, "error": str(e)}

# ... (código existente)

@app.get("/api/export/excel")
def export_excel(date: str = None):
    try:
        # 1. Obtener datos de Firebase
        ref = db.reference('activities')
        
        # Filtro básico por fecha (si se envía)
        # Nota: Firebase RTDB no tiene filtros complejos nativos, 
        # para producción idealmente filtraríamos por query o estructuraríamos por fecha.
        # Por ahora descargamos todo y filtramos en Pandas (OK para <10k registros)
        snapshot = ref.get()
        
        if not snapshot:
            return {"error": "No hay datos para exportar"}

        # 2. Convertir a DataFrame
        data_list = []
        for key, val in snapshot.items():
            val['id'] = key
            data_list.append(val)
            
        df = pd.DataFrame(data_list)
        
        # Filtrar por fecha si se solicitó
        if date:
            # Asumiendo formato YYYY-MM-DD en timestamp y parámetro
            df = df[df['timestamp'].str.startswith(date)]

        if df.empty:
             return {"error": f"No hay registros para la fecha {date}"}

        # 4. Traducir columnas y seleccionar las relevantes
        column_mapping = {
            'timestamp': 'Fecha/Hora',
            'rateCode': 'Código',
            'description': 'Descripción',
            'unitPrice': 'Precio Unitario',
            'assigned': 'Cant. Asignada (Meta)',
            'completed': 'Cant. Ejecutada',
            'projectedValue': 'Valor Proyectado (S/.)',
            'realizedValue': 'Valor Realizado (S/.)',
            'mainTechName': 'Técnico Principal',
            'partnerTechName': 'Técnico Auxiliar'
        }
        
        # Seleccionar solo las columnas que nos interesan y existan en el DF
        cols_to_keep = [col for col in column_mapping.keys() if col in df.columns]
        df_final = df[cols_to_keep].rename(columns=column_mapping)

        # 5. Generar Excel en memoria
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df_final.to_excel(writer, index=False, sheet_name='Reporte')
        
        output.seek(0)
        
        # 4. Retornar archivo
        filename = f"reporte_{date if date else 'completo'}.xlsx"
        return StreamingResponse(
            output, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        return {"error": str(e)}
