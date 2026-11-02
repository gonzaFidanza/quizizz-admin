export interface Caso {
  titulo: string
  texto: string
}

const CARGO_OUTSOURCING = `Nombre del cargo: Representante ante Outsourcing. Departamento: Sistemas de Información.
Nivel jerárquico: primera línea. Subordinación: Gerente General. Supervisión: no presenta. Comunicaciones laterales: Gerente Comercial, Gerente de RR.HH., Gerente de Mantenimiento e Ingeniería.
Resumen: es el encargado de asegurar tanto los niveles de servicios de los sistemas de información y tecnologías de soporte, así como la satisfacción de la demanda de aplicaciones que sean objeto de contrato en el esquema de tercerización de los SI/TI.
Descripción detallada: conocer la cultura, valores y contexto de la empresa para desempeñar un buen trabajo como intermediario entre la organización y la/s empresa/s. Conocer los procesos del negocio realizados en cada área. Ser un facilitador del vínculo de confianza y la evolución del proyecto. Participar en la selección de la mejor alternativa entre las empresas de outsourcing. Controlar los desarrollos y los servicios especificados en el contrato. Aprobar las certificaciones de servicio a la/s empresa/s contratada/s.
Análisis del cargo. Educación: título de Ingeniero o Licenciado en Sistemas de Información; conocimiento certificado en planificación de proyectos. Experiencia: 3 años como mínimo en ingeniería de requerimientos y tecnologías de información. Iniciativa: espíritu innovador y sentido crítico. Competencias: planeación y control, orientación a resultados, visión del negocio, detección de riesgos, escucha y comunicación. Exigencias físicas: exposición media y no constante a monitores. Responsabilidades implícitas: confidencialidad de la información; cumplimiento de tareas sujetas a contrato; responsabilidades administrativas sobre los contratos. Condiciones de trabajo: ambiente de oficina.`

export const casos: Record<string, Caso> = {
  outsourcing: {
    titulo: 'Representante ante Outsourcing (2.º parcial 2025)',
    texto: `El Gerente General de una firma que brinda servicios generales a otras empresas (instalación y mantenimiento de sistemas eléctricos, de redes de comunicaciones, albañilería menor, limpieza, etc.) recientemente ha tercerizado los servicios de SI/TI y lo ha contratado para que lo asesore sobre la organización y gestión del cargo que será el nexo coordinante con la/s empresa/s contratada/s.

${CARGO_OUTSOURCING}

La empresa plantea incorporarse a la IEEE para ser referente local, participar en proyectos de innovación y desarrollo y ser ente certificador de las normas IEEE. Existe una persona con cuatro años de experiencia en la empresa, en distintos cargos administrativos, con título de Ingeniero en Sistemas de Información recibido en marzo de 2023. El gerente general desea priorizar el reclutamiento interno para ocupar el cargo.`,
  },
  supervisor: {
    titulo: 'Supervisor de Sistemas de Sucursal (1.er parcial 2025)',
    texto: `Empresa proveedora de televisión digital. Cargo: Supervisor de Sistemas. Dependencia: Gerencia Central de Sistemas. Jerarquía: gerencia de primera línea. Relaciones laterales: Gerencia Técnica de sucursal.
Resumen: planificar, organizar, coordinar y controlar las actividades del área de sistemas de la sucursal.
Descripción detallada: planificar, organizar, coordinar y controlar la administración del servidor de BD local, la implementación de las nuevas aplicaciones de información en toda la sucursal, la capacitación del personal usuario de las aplicaciones y el reemplazo y mantenimiento del HW y SW de la sucursal. Detección de necesidades de mejoras o cambios. Manejo de seguridad de los archivos y documentación respaldatoria. Apoyo a la Gerencia Técnica de la sucursal.
Requisitos intelectuales: Ingeniero en Sistemas de Información; amplios conocimientos de administración de redes y de BD; experiencia en liderazgo de equipos.
Responsabilidades: software desarrollado a medida, equipamiento informático, BD, manejo de información y personal a cargo; sobre el presupuesto, solo la ejecución del presupuesto asignado.`,
  },
  rotacion: {
    titulo: 'Rotación de administradores de red (parcial 2006)',
    texto: `Usted se ha incorporado como gerente del área de SI/TI de una compañía. El gerente general le plantea el alto índice de rotación en su equipo de administradores de red (5 cargos). En algunos casos se produjo al terminar el período de socialización; en otros, transcurridos entre 6 y 8 meses de trabajo. Le cuesta alrededor de $3.000 por administrador que se desvincula, cada seis meses en promedio.`,
  },
  programa2006: {
    titulo: 'Programa para un nuevo Administrador de Red (parcial 2006)',
    texto: `La causa que motiva el programa es la admisión de una persona ajena a la organización como nuevo Administrador de Red. Se detecta la necesidad de capacitarlo en dos aspectos: interiorización sobre la organización y adiestramiento en el software y hardware de red.
Parte 1, presentación de la organización: el objetivo es dar a conocer la estructura, objetivos y políticas principales y presentarlo al personal jerárquico. Un solo módulo expuesto por un empleado de RRHH junto con el responsable de Sistemas; 40 minutos, antes de que comience sus actividades, un martes al iniciar la jornada.
Parte 2, adiestramiento: módulos de configuración lógica y física de la red, seguridad, programación y aplicaciones, limitaciones del puesto, documentación elaborada por el administrador y problemas más frecuentes. El método es explicar de manera oral y práctica, usando el equipamiento disponible y la documentación del puesto.`,
  },
  sysbench: {
    titulo: 'Salida de sysbench (2.ª evaluación 2024)',
    texto: `sysbench --test=fileio --file-total-size=150G --file-test-mode=seqwr run
Number of threads: 1. 128 files, 1,1719GiB each. 150GiB total file size. Block size 16KiB. Synchronous I/O mode. Doing sequential write (creation) test.
File operations: reads/s 0,00; writes/s 4630,35; fsyncs/s 5939,63.
Throughput: read 0,00 MiB/s; written 72,35 MiB/s.
General statistics: total time 10,0204 s; total number of events 105792.
Latency (ms): min 0,01; avg 0,09; max 100,43; 95th percentile 0,18; sum 9932,03.
Threads fairness: events (avg/stddev) 105792/0,00; execution time (avg/stddev) 9,9320/0,00.`,
  },
  bne: {
    titulo: 'Biblioteca Nacional de España (recuperatorio 2025)',
    texto: `La BNE maneja obras y manuscritos, archivos personales, incunables e impresos reservados, cuyo valor de compra lícita puede iniciarse en los 60.000 euros. A la BNE no se accede en forma libre: lectores (fondos publicados a partir de 1958) e investigadores (fondos anteriores) deben tener credenciales, que se otorgan luego de verificaciones y controles y valen cinco años. El servicio de Autocopia autoriza a los usuarios a fotografiar fondos con sus dispositivos móviles, con autorización y supervisión del personal. El uso de las imágenes debe respetar la legislación sobre derechos de autor, propiedad intelectual y protección de datos, y los usuarios son legalmente responsables de cualquier uso indebido.`,
  },
  stylestore: {
    titulo: 'StyleStore (mesa 28/02/2024)',
    texto: `StyleStore vende perfumes, ropa y accesorios. Para potenciar sus ventas implementó un e-commerce con VTEX y agregó MagicMirror, una funcionalidad de realidad aumentada con la que los clientes pueden probarse lentes y otros accesorios. Las ventas crecieron tanto que abrieron tiendas virtuales en locales físicos, y la empresa destaca MagicMirror como el servicio que la distingue.`,
  },
}
