

Tags
----

[jsreport/jsreport](https://hub.docker.com/r/jsreport/jsreport/) image is automatically pushed with adequate tags into [docker hub](https://www.docker.com/)  public repository in two variations:

- `jsreport/jsreport:2.7.1` ([Dockerfile](https://github.com/jsreport/jsreport/blob/master/docker/default/Dockerfile))  contains default installation from npm
- `jsreport/jsreport:2.7.1-full` ([Dockerfile](https://github.com/jsreport/jsreport/blob/master/docker/full/Dockerfile)) contains default installation plus all the community extensions including [wkhtmltopdf](http://jsreport.net/learn/wkhtmltopdf) or [electron](https://github.com/bjrmatos/jsreport-electron-pdf) recipes

You can find the [list of all available tags and previous versions here](https://hub.docker.com/r/jsreport/jsreport/tags/)

Usage
-----

1. Install [Docker](https://www.docker.com/)
2. `docker run -p 80:5488 jsreport/jsreport:2.7.1`

This is the most basic usage. It will start jsreport server on port 80 directly in the current shell with data and configuration stored directly in container. Change 80 http port to whatever you want.

Start on reboot
---------------

You may want to additionally run the container as daemon and restart it on system reboot
```sh
docker run -d -p 80:5488 --restart always jsreport/jsreport:2.7.1
```

Configuring jsreport
--------------------

The easiest way is to pass the [configuration](https://jsreport.net/learn/configuration) as environment variables. The [authentication](http://jsreport.net/learn/authentication) can be for example applied in this way

```sh
docker run -e "extensions_authentication_admin_username=admin" -e "extensions_authentication_admin_password=xxx" -e "extensions_authentication_cookieSession_secret=yyylong" -p 80:5488 jsreport/jsreport:2.7.1
```

Notice that `_` is used as a separator for nested configuration properties. This works usually better in docker environments than also supported `:` separator.


Persist templates
-----------------

The templates are by default persisted inside the container. You may rather want to store them in a mounted directory or in an external database.

Mount directory
---------------

To mount directory with data you need to create directory `/myjsreport` first, make sure user running docker has permissions for it, and then run docker as
```sh
docker run -p 80:5488 -v /myjsreport:/jsreport jsreport/jsreport:2.7.1
```
Note that you can also create `jsreport.config.json` inside the mounted directory and reconfigure jsreport before starting it.
In case you're running the docker desktop on windows, use `-v c:/myjsreport:/jsreport` and make sure the drive is shared in the docker settings.

Apply license key
-----------------

You can apply your license key into the jsreport container using one of the following methods:

- passing the license key value through an env var `docker run -e "license-key=xxyour-key-herexx" -p 80:5488 jsreport/jsreport:2.7.1` or `docker run -e "licenseKey=xxyour-key-herexx" -p 80:5488 jsreport/jsreport:2.7.1`
- put a `license-key.txt` file with your key inside the data folder of [mounted directory](#mount-directory). Ex: if your mounted directory is located at `/jsreport-home` then you can put your license key at `/jsreport-home/data/license-key.txt` and then start the container normally.

Persist in external database
----------------------------

The full image like `jsreport/jsreport:2.7.1-full` has all the custom data stores like [mongodb](https://github.com/jsreport/jsreport-mongodb-store), [mssql](https://github.com/jsreport/jsreport-mssql-store) or [PostgreSQL](https://github.com/jsreport/jsreport-postgres-store) already installed. You only need to properly configure the `store` environment variable. For example

```sh
docker run -e "store_provider=mssql" -e "extensions_mssqlStore_uri=Server=tcp:jsreport.database.windows.net,1433;Initial Catalog=jsreport;Persist Security Info=False;User ID=myuser;Password=password;MultipleActiveResultSets=False;Encrypt=True;" -p 80:5488 jsreport/jsreport:2.7.1-full
```

Customize docker image
----------------------------

There is the dedicated article how to create your own customized docker image with the jsreport app.
https://jsreport.net/learn/customize-docker-image
