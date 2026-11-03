import type { ItemDef } from '../lib/quiz'

// Cuestionario de estudio U6 (material/cuestionarios-U4-U6.pdf).
// Solo lo que no estaba cargado en parciales-u6 / propias-u6.
export const cuestionarioU6: ItemDef[] = [
  // ───── Cerradas
  {
    t: 'mc',
    tema: 'Administración del riesgo',
    q: 'Según la definición de la profesora, el riesgo es:',
    o: [
      'La probabilidad de que una amenaza afecte a un activo, aprovechando una vulnerabilidad asociada a ese mismo activo.',
      'Una debilidad de un activo que puede ser aprovechada por una amenaza.',
      'La pérdida potencial multiplicada por la frecuencia de pérdida.',
      'La falla de los elementos de un SI para brindar los servicios para los que estaba destinado.',
    ],
    a: 0,
    e: 'La b es vulnerabilidad, la c es pérdida esperada y la d es pérdida de seguridad. Al redactar un riesgo: qué activo, qué le puede pasar, por qué y con qué frecuencia.',
  },
  {
    t: 'multi',
    tema: 'Control interno',
    q: 'Según la definición de Schuster que recoge Lardent, ¿cuáles son objetivos del control interno?',
    o: [
      'Resguardo de activos.',
      'Cumplimiento de políticas internas y exigencias legales.',
      'Exactitud e integridad de las transacciones.',
      'Confiabilidad de los procesos y de la información.',
      'Eficacia y economía de las operaciones.',
      'Emitir una opinión independiente sobre los sistemas.',
      'Transferir los riesgos a un tercero.',
    ],
    a: [0, 1, 2, 3, 4],
    e: 'Opinar sobre los sistemas es tarea de la auditoría: el control interno son las medidas; la auditoría evalúa si funcionan.',
  },
  {
    t: 'rel',
    tema: 'Control interno',
    q: 'Relacione cada clase de control interno con su orientación (Lardent).',
    i: [
      ['Salvaguarda de activos y confiabilidad de registros y transacciones.', 'Contables'],
      ['Que las actividades y funciones de la organización alcancen sus objetivos.', 'Operativos'],
      ['Cumplimiento de las políticas generales y normas de la dirección.', 'Administrativos'],
    ],
    extra: ['Correctivos', 'Físicos'],
  },
  {
    t: 'rel',
    tema: 'Auditoría de la función informática',
    q: 'Relacione cada actividad con el grupo de funciones del ambiente informático al que pertenece (Lardent).',
    i: [
      ['Análisis, desarrollo y mantenimiento de aplicaciones.', 'Proyectos'],
      ['Captura de datos, operaciones informáticas y distribución de resultados.', 'Procesamiento de información'],
      ['Administración de seguridad, bases de datos, redes y software base.', 'Servicios técnicos'],
      ['Verificación de entradas y salidas, registros y calidad.', 'Control'],
    ],
    extra: ['Auditoría'],
  },
  {
    t: 'vf',
    tema: 'Políticas de seguridad',
    q: 'Indique el grado de veracidad de las siguientes afirmaciones.',
    i: [
      ['Lógica/física es una clasificación de las políticas de seguridad.', false, 'Es una clasificación de las contramedidas.'],
      ['Refinar una política general en indicaciones precisas para cierta parte del sistema se llama política de aplicación específica.', true],
      ['Las políticas específicas pueden ser por activo, por situación o por perfil de usuario.', true],
      ['La auditoría de organización del ambiente informático se limita al Departamento de Informática.', false, 'También considera las áreas usuarias que producen, procesan o usan información.'],
      ['El control interno evalúa si las medidas de la auditoría funcionan efectivamente.', false, 'Es al revés: la auditoría evalúa las medidas de control interno.'],
      ['Auditar un sistema no significa operarlo, sino examinar evidencia de que funciona según sus objetivos y controles.', true],
    ],
  },
  // ───── Abiertas
  {
    t: 'dev',
    tema: 'Management seguro',
    q: '¿Qué cuestiones determinan el management de los SI de un modo «seguro»?',
    m: 'Administrar los SI/TI de un modo seguro implica tres aspectos: seguros desde el punto de vista organizacional o técnico (herramientas, fuentes de datos, procedimientos internos), social o ético, y judicial o legal (requisitos legales de ciertos procedimientos). Se superponen: el marco legal codifica una perspectiva social de lo correcto. Además, requiere un punto de equilibrio óptimo entre los costos de las contramedidas y los costos potenciales de una falla de seguridad.',
    k: ['Organizacional/técnico', 'Social/ético', 'Judicial/legal', 'Se superponen', 'Equilibrio de costos'],
  },
  {
    t: 'dev',
    tema: 'Administración del riesgo',
    q: '¿Qué es la administración del riesgo? ¿Cómo se relaciona con la seguridad?',
    m: 'Es el management sistemático del riesgo de exposición de cada elemento de los SI, que equilibra el costo de una falla con el costo de las medidas, y permite elegir e implementar contramedidas de forma planeada. No se administra la seguridad en sí sino el nivel de riesgo: menos riesgo, más seguridad. Como la seguridad absoluta es imposible o inviable, gestionar la seguridad es administrar el riesgo, con cuatro estrategias: prevenir, reducir, asumir (si las pérdidas son tolerables) y transferir (seguros o contratos; útil para alto costo y baja probabilidad).',
    k: ['Equilibrio de costos', 'Se administra el nivel de riesgo', 'Seguridad absoluta imposible', 'Cuatro estrategias'],
  },
  {
    t: 'dev',
    tema: 'Administración del riesgo',
    q: 'Enumere y sintetice las etapas de la administración del riesgo.',
    m: 'Según Robson: 1) Identificación: encontrar los puntos débiles en el orden activo → vulnerabilidad → amenaza, con su tipo (física o lógica; accidental o deliberada) y el aspecto afectado. Activos: HW, SW, datos, capacidad de procesamiento, personal y fondos. 2) Análisis: pérdida esperada = pérdida potencial × frecuencia de pérdida, con frecuencia = probabilidad de agresión × probabilidad de éxito; da la exposición anual y al final se redacta el riesgo. 3) Manejo: elegir y justificar una estrategia, definir medidas por línea de defensa (prevención, detección, recuperación) y redactar una política prohibitiva y una permisiva. 4) Planificación de contingencias y recuperación ante desastres (según la profe, no entra en el parcial).',
    k: ['Identificación', 'Análisis y fórmulas', 'Manejo', 'Contingencias'],
  },
  {
    t: 'dev',
    tema: 'Políticas de seguridad',
    q: '¿Cómo se clasifican las políticas de seguridad?',
    m: 'Una política es un lineamiento general de alto nivel que indica qué está permitido y qué no; es preventiva y pertenece a la primera línea de defensa. Según su amplitud: generales y específicas (por activo, situación o perfil; refinarlas para una parte del sistema es una política de aplicación específica). Según su tipo: prohibitivas (todo lo no permitido expresamente está prohibido) y permisivas (todo lo no prohibido expresamente está permitido). Las prohibitivas son más efectivas. Lógica/física clasifica contramedidas, no políticas.',
    k: ['Primera línea de defensa', 'Generales y específicas', 'Prohibitivas y permisivas', 'Las prohibitivas son más efectivas'],
  },
  {
    t: 'dev',
    tema: 'Delito informático',
    q: '¿Qué es el delito informático? ¿Con qué modalidades operan sus artífices?',
    m: 'Es toda acción culpable de un ser humano que cause perjuicio a otros, aunque el autor no se beneficie, o le produzca un beneficio ilícito aunque no perjudique directamente a la víctima, tipificada por la ley, realizada en un entorno informático y sancionada con una pena. Modalidades (un ataque es la realización de una amenaza): interrupción (contra la disponibilidad), intercepción (confidencialidad), modificación (integridad) y fabricación (autenticidad). Pasivos: solo escuchan o analizan tráfico; difíciles de detectar, se evitan con cifrado. Activos: suplantación de identidad, reactuación, modificación de mensajes y degradación fraudulenta del servicio.',
    k: ['Concepto', 'Cuatro categorías de ataque', 'Pasivos', 'Activos'],
  },
  {
    t: 'dev',
    tema: 'Administración del riesgo',
    q: 'Defina riesgo. ¿Qué debe responder la redacción de un riesgo?',
    m: 'Riesgo es la probabilidad de que una amenaza afecte a un activo, aprovechando una vulnerabilidad asociada a ese mismo activo (ISACA: el potencial de que una amenaza explote las vulnerabilidades de un activo o grupo de activos, ocasionando su pérdida o daño). La redacción debe responder: qué activo, qué le puede pasar, por qué y con qué frecuencia.',
    k: ['Amenaza, activo y vulnerabilidad del mismo activo', 'Qué activo, qué, por qué, con qué frecuencia'],
  },
  {
    t: 'dev',
    tema: 'Auditoría informática',
    q: 'Dé el concepto de auditoría de sistemas según Lardent. ¿Qué propiedades considera la revisión?',
    m: 'Es una revisión sistemática y organizada de los sistemas en funcionamiento para comprobar que mantienen las propiedades que fundamentaron su diseño y operación. Propiedades: vigencia de los objetivos (siguen siendo válidos), efectividad (cumple los objetivos), permanencia del diseño (no hubo modificaciones que lo deterioren) y eficiencia (obtiene los resultados con buen aprovechamiento de recursos). También puede revisar rastros de auditoría, controles de entrada, proceso y salida, tratamiento de errores, autorizaciones de cambios y respeto de normas. Auditar no es operar el sistema.',
    k: ['Revisión sistemática de sistemas en funcionamiento', 'Vigencia', 'Efectividad', 'Permanencia del diseño', 'Eficiencia'],
  },
  {
    t: 'dev',
    tema: 'Control interno',
    q: 'Dé el concepto de control interno según Lardent (Schuster), sus objetivos y sus clases. ¿En qué se diferencia de la auditoría?',
    m: 'Comprende el plan de organización, los métodos coordinados y las medidas que adopta una empresa para proteger sus activos, comprobar la confiabilidad de los datos, impulsar la eficiencia operativa y asegurar el cumplimiento de las políticas. Objetivos: resguardo de activos, cumplimiento de políticas y exigencias legales, exactitud e integridad de transacciones, confiabilidad de procesos e información, y eficacia y economía de las operaciones. Clases: contables, operativos y administrativos. El control interno son las medidas que diseña y ejecuta la organización; la auditoría evalúa si son adecuadas y funcionan.',
    k: ['Concepto de Schuster', 'Cinco objetivos', 'Contables, operativos, administrativos', 'Diferencia con la auditoría'],
  },
  {
    t: 'dev',
    tema: 'Auditoría de la función informática',
    q: 'Según Lardent, ¿qué evalúa la auditoría de organización y administración del ambiente informático y qué funciones comprende? ¿Cómo se aplica?',
    m: 'Examina políticas, administración, estructura y controles del procesamiento de información, incluidas las áreas usuarias. Evalúa separación de funciones, protección de archivos, diseño del control interno, niveles de autorización, estándares y procedimientos, documentación y formación del personal. Comprende cuatro grupos de funciones: proyectos, procesamiento de información, servicios técnicos y control. Aplicación (síntesis didáctica): relevar objetivos y organización, revisar documentación, verificar la realidad operativa con entrevistas, observación y pruebas, evaluar hallazgos y riesgos, e informar conclusiones y recomendaciones. El informe incluye introducción, hallazgos y recomendaciones, acciones correctivas, opinión del auditor y anexos.',
    k: ['Incluye áreas usuarias', 'Qué evalúa', 'Cuatro grupos de funciones', 'Pasos de aplicación', 'Informe'],
  },
]
