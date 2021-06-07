yum install git -y 
git clone https://github.com/sebsto/tictactoe-dynamodb

curl -O https://bootstrap.pypa.io/get-pip.py
python3 get-pip.py

cd tictactoe-dynamodb/
/usr/local/bin/pip install -r requirements.txt

USE_EC2_INSTANCE_METADATA=true python3 application.py --serverPort 8080