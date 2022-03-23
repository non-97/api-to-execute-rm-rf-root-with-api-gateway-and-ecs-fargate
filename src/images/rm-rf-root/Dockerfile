FROM node:14-slim

WORKDIR /usr/src/app

COPY . .

RUN apt-get update \
  && apt-get upgrade -y \
  && apt-get clean \
  && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/* \
  && npm install 


EXPOSE 80

CMD ["npm", "start"]