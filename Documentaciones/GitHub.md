# Cómo vincular GitHub desde tu PC?
#### 1. Descargar Git
    1. En windows:
       1. Ve a la página oficial: https://git-scm.com/download/win
       2. Seleccionar el standalone installer que se acomode a su SO (x64 o ARM64).
       3. Ejecutar el .exe descargado y seguir los pasos.
       4. Abrir una terminar, por ejemplo powershell, y verificar la versión con
            git --version

    2. En MacOS:
       1. Instala brew si no lo tienes con:
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
       2. Reinicia la terminal.
       3. Instala git con:
            brew install git
       4. Verificar con git --version

    3. En Linux (Ubuntu):
       1. Abre la terminal
       2. Instala git con:
            sudo apt install git
       3. Verifica la versión con:
            git --version

#### 2. Configuraciones globales.
    git config --global user.name "<nombre_de_usuario>"
    git config --global user.email "<correo_de_cuenta@ejemplo.cl>"

#### 3. Vincular repositorio.
    1. Crear una carpeta donde va a estar guardado el proyecto.
    2. En una terminal, posicionarse en la carpeta del proyecto con:
        cd "dirección/del/proyecto/"
    3. Iniciar un git con:
        git init
    4. Vincular la carpeta con la dirección del repositorio (para ejemplos prácticos, el github de DMAC):
        git remote add origin https://github.com/DataMarketAnalysisClub/DMAC_2025-2.git
    5. verificar conexión con:
        git remote -v
    6. Si el repositorio está vacío (que es lo más probable con un repo nuevo):
        1. El comando "git add archivo.extensión" es para agragr o realizar cambios de un archivo (esto se debe hacer al crear, actualizar o eliminar un archivo). Si se quiere actualizar todo: git add .
        2. Hay que hacer un commit, con 'git commit -m "mensaje"'. En esta parte, -m es para agregar el mensaje que se eescribe a continuación con comillas.
        3. Hacer un push con todos de los archivos agregados (add), y la confirmación (commit), con el comando: git push -u origin main. Push, es el comando para empujar los cambios, -u es para vincular tu rama local main con lo que escribas despues, que en este caso es origin/main.

#### Qué pasa si un colaborador actualiza el github?

Siempre deberías tener la versión más reciente del repositorio. Esto significa que, en caso de estar colaborando, hacer un pull request si tu versión es una atrasada.

Para ello:
1. 'git fetch' para actualizar la info del repositorio
2. 'git status' para verificar el estado de la rama
    El output podría ser algo así como:
        Your branch is behind 'origin/main' by X commits, and can be fast-forwarded.
3. 'git pull' si la rama está atrasada.

Con ello, quedan explicados los comandos básicos para vincular un repositorio de github con un repo local.