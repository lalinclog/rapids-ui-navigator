FROM postgres:14
COPY 00-create-multiple-databases.sh /docker-entrypoint-initdb.d/00-create-multiple-databases.sh
RUN chmod +x /docker-entrypoint-initdb.d/00-create-multiple-databases.sh
