# API Node.js + MySQL (Docker Compose)

Passo a passo completo do zero.

## 0. Pré-requisitos

Instale o Docker Desktop (já vem com Docker Compose):
https://www.docker.com/products/docker-desktop/

Verifique se está instalado:
```
docker --version
docker compose version
```

## 1. Estrutura do projeto

Você já tem todos os arquivos prontos:
```
api-mysql-project/
├── server.js
├── db.js
├── package.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 2. Subir os containers

Dentro da pasta do projeto, rode:
```
docker compose up --build
```

Isso vai:
1. Construir a imagem da API (instalar as dependências do package.json)
2. Baixar a imagem do MySQL
3. Subir os dois containers na mesma rede
4. Esperar o MySQL ficar saudável (healthcheck) antes de iniciar a API

Você vai ver nos logs algo como:
```
minha_api  | 🚀 API rodando na porta 3000
minha_api  | ✅ Conectado ao MySQL com sucesso!
```

Se aparecer "✅ Conectado ao MySQL com sucesso!", a conexão está funcionando.

## 3. Testar se está tudo certo

Com os containers rodando, abra outro terminal (ou o navegador) e teste:

```
curl http://localhost:3000/
curl http://localhost:3000/teste-db
```

O `/teste-db` deve retornar a hora atual do banco, algo como:
```json
{ "conectado": true, "horaDoBanco": "2026-06-21T20:57:00.000Z" }
```

## 4. Criar uma tabela de exemplo (opcional)

Para testar a rota `/usuarios`, entre no MySQL do container:
```
docker exec -it meu_mysql mysql -uroot -psenha123 meubanco
```

E crie a tabela:
```sql
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100),
  email VARCHAR(100)
);

INSERT INTO usuarios (nome, email) VALUES ('Maria', 'maria@email.com');
```

Saia com `exit`, e teste:
```
curl http://localhost:3000/usuarios
```

## 5. Parar os containers

```
docker compose down
```

Para apagar também os dados do banco:
```
docker compose down -v
```

## Problemas comuns

**"Error: connect ECONNREFUSED"**
O MySQL ainda não terminou de iniciar. O `depends_on` com `condition: service_healthy`
já resolve isso na maioria dos casos, mas se acontecer, espere alguns segundos e a API
vai reconectar automaticamente na próxima requisição (o pool tenta de novo).

**Porta 3306 já em uso**
Você provavelmente tem um MySQL instalado localmente. Pode mudar a porta exposta no
docker-compose.yml, por exemplo `"3307:3306"`, sem afetar a conexão interna entre os
containers (que usa sempre a porta 3306 internamente).

**Mudou o docker-compose.yml ou o Dockerfile**
Rode `docker compose up --build` de novo para reconstruir.
