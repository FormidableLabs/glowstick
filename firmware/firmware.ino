#include <SPI.h>

#define SERIAL_CONSOLE true

const int CableSelectPin = 0;

char screenBuffer[64];



#define FIRMWARE_MAJOR   (0x0)
#define FIRMWARE_MINOR   (0x1)
#define COMM_PACKET_STX  (0x81)
#define DISPLAY_WIDTH    (8)
#define DISPLAY_HEIGHT   (8)
#define DISPLAY_PIXELS   (DISPLAY_WIDTH * DISPLAY_HEIGHT)
#define DEFAULT_REFRESH_DELAY (50)


enum PacketTypes{ PktNop=0,
                  PktVersionRequest=0x1, PktVersionReply=0x2,
                  PktInfoRequest=0x3, PktInfoReply=0x4,
                  PktSelfTestRequest=0x5, PktSelfTestReply=0x6,
                  PktSetPixelRequest=0x7, PktSetScreenRequest=0x8,
                 };
                 
#define MAX_CMD_ID (PktSetScreenRequest)

enum RecvState { Rx_Idle=0, Rx_PacketLength, Rx_PacketType, Rx_PacketData};

struct DevicePacket{
	PacketTypes type;
	unsigned char length;
	unsigned char index;	//! index is the location that the next read byte will be placed. Reading is complete when (index == length)
	byte data[192];
};


struct SystemState {
  struct DevicePacket rxBuffer;
  struct DevicePacket txBuffer;
  
  int refreshDelay;
  int rxFrames;
  RecvState rxState;
};


struct SystemState sysState;

void initSerialInterface() {
  sysState.rxState = Rx_Idle;
  sysState.rxFrames = 0;
  sysState.refreshDelay = DEFAULT_REFRESH_DELAY;
  
  Serial.begin(115200);
}

void transmitSerialReply(){  
  Serial.write(COMM_PACKET_STX);
  Serial.write(sysState.txBuffer.type);
  Serial.write(sysState.txBuffer.length);
  Serial.write(sysState.txBuffer.data, sysState.txBuffer.length);
  Serial.flush();
}

void processSerialCommand(){
  	/*
  	 *		[STX] [Type] [Length] {DATA x Length}
  	 */
  
 if( ((PacketTypes)sysState.rxBuffer.type) == PktVersionRequest ){
    // [STX] [PktVersionRequest] [2] {Major, Minor}
    
    sysState.txBuffer.type = PktVersionReply;
    sysState.txBuffer.length = 2;
    sysState.txBuffer.data[0] = FIRMWARE_MAJOR;
    sysState.txBuffer.data[1] = FIRMWARE_MINOR;
    
    transmitSerialReply();
  	}
  else if( ((PacketTypes)sysState.rxBuffer.type) == PktInfoRequest ){
    // [STX] [PktInfoRequest] [0]
    
    sysState.txBuffer.type = PktInfoReply;
    sysState.txBuffer.length = 4;
    sysState.txBuffer.data[0] = DISPLAY_WIDTH;
    sysState.txBuffer.data[1] = DISPLAY_HEIGHT;
    sysState.txBuffer.data[2] = sysState.rxFrames;
    sysState.txBuffer.data[3] = sysState.rxState;
    
    transmitSerialReply();
  }
  else if( ((PacketTypes)sysState.rxBuffer.type) == PktSelfTestRequest ){
    // [STX] [PktSelfTestRequest] [0]
    selfTest();
    clearScreen();
  }
  else if( ((PacketTypes)sysState.rxBuffer.type) == PktSetPixelRequest ){
    // [STX] [PktSetPixelRequest] [5] { X, Y, R, G, B}
    
    //Set pixel
    setPixel( sysState.rxBuffer.data[0],  //X
              sysState.rxBuffer.data[1],  //Y
              sysState.rxBuffer.data[2],  //Red
              sysState.rxBuffer.data[3],  //Green
              sysState.rxBuffer.data[4]   //Blue
            );
    sendBuffer(screenBuffer, 64);

  }
  else if( ((PacketTypes)sysState.rxBuffer.type) == PktSetScreenRequest ){
    
    // [STX] [PktSetScreenRequest] [DISPLAY_PIXELS*3] {R, G, B, ... }
    
    //Update display
    for(int i=0; i<DISPLAY_PIXELS; i++){
      int offset=i*3;
      
      setPixelByIndex(i, sysState.rxBuffer.data[offset], sysState.rxBuffer.data[offset+1], sysState.rxBuffer.data[offset+2]);
    }
    
    sendBuffer(screenBuffer, 64);
    sysState.rxFrames++;
  }
}

void readSerialCommand(){
	int bytesReady = Serial.available();

	if(bytesReady > 0){
		for(int i=0; i<bytesReady; i++){
			byte temp = Serial.read();

			if(sysState.rxState == Rx_Idle && temp == COMM_PACKET_STX){
				//Reset packet buffer
				sysState.rxBuffer.type = (PacketTypes) 0;
				sysState.rxBuffer.length = 0;
				sysState.rxBuffer.index = 0;
				sysState.rxState = Rx_PacketType;
			}
			else if(sysState.rxState == Rx_PacketType){
				if( (PacketTypes) temp > MAX_CMD_ID){
					//Invalid packet type, start over
					sysState.rxState = Rx_Idle;
					continue;
				}

				sysState.rxBuffer.type = (PacketTypes) temp;
				sysState.rxState = Rx_PacketLength;
			}
			else if(sysState.rxState == Rx_PacketLength){
				if(temp > sizeof(sysState.rxBuffer.data)){
					//Invalid packet lenght, start over
					sysState.rxState = Rx_Idle;
					continue;
				}

				sysState.rxBuffer.length = temp;
				sysState.rxBuffer.index = 0;
        if(sysState.rxBuffer.length > 0) {
				  sysState.rxState = Rx_PacketData;
        }
        else{
          //Run command
          processSerialCommand();

          //Get ready for next packet
          sysState.rxState = Rx_Idle;
        }
			}
			else if(sysState.rxState == Rx_PacketData){
				if(sysState.rxBuffer.index < sysState.rxBuffer.length){
					sysState.rxBuffer.data[sysState.rxBuffer.index++] = temp;

					if(sysState.rxBuffer.index == sysState.rxBuffer.length){
						//Run command
						processSerialCommand();

						//Get ready for next packet
						sysState.rxState = Rx_Idle;
					}
				}
				else{
					//Somethings not right, start over
					sysState.rxState = Rx_Idle;
				}
			}
		}
	}
}

void setChainLength(int lenght){
  char cmd[] = {'%', lenght};
  
  sendBuffer(cmd, 2);
}

void clearScreen(){
  int i=0;
  for(i; i<64; i++){
   screenBuffer[i]=0; 
  }
}

void setPixelByIndex(int index, int r, int g, int b){
  
  r = map(r, 0, 255, 0, 0x7);
  g = map(g, 0, 255, 0, 0x7);
  b = map(b, 0, 255, 0, 0x3);
  
  screenBuffer[index] = ((r & 0x7) << 5) |
                        ((g & 0x7) << 2) |
                        (b & 0x3);
}


void setPixel(int x, int y, int r, int g, int b){
  setPixelByIndex(x + y*8, r, g, b);
}


void sendBuffer(char buffer[], int length){
  digitalWrite(CableSelectPin, LOW);

  if(length==64){
    SPI.transfer(0x26);
  }

  int idx=0;
  for(; idx<length; idx++){
    SPI.transfer(buffer[idx]);
  }

  digitalWrite(CableSelectPin, HIGH);
}

void selfTest(){
  for(int y=0; y<DISPLAY_HEIGHT; y++){
    for(int x=0; x<DISPLAY_WIDTH; x++){  
      setPixel(x, y, 0, 0, 0); 
    }
  }
  
  for(int x=0; x<DISPLAY_WIDTH; x++){
    
    byte color[3] = {0, 0, 0};
    
    for(int chan=0; chan<3; chan++){
      for(int val=0; val<255; val+=32){
        color[chan]=val;
        /*color[0]=val;
        color[1]=val;
        color[2]=val;*/
        
        for(int y=0; y<DISPLAY_HEIGHT; y++){
          setPixel( x, y, color[0], color[1], color[2] );
        }
        
        sendBuffer(screenBuffer, 64);
        delay(5);
      }
    }
  }
  
  int color[3]={0,0,0};
  for(int x=0; x<DISPLAY_WIDTH; x++){
    for(int y=0; y<DISPLAY_HEIGHT; y++){
      int value = ((256/(DISPLAY_HEIGHT)) * y) + 64;
      
      if(x<3){
        color[0] = value/3;
      }
      else{
        color[0] = value;
      }
      
      if(x>2 && x<6){
        color[1] = value/3;
      }
      else{
        color[1] = value;
      }
      
      if(x>5){
        color[2] = value/3;
      }
      else{
        color[2] = value;
      }
      
      setPixel(x,y, color[0], color[1], color[2]);
    }
  }
  
  sendBuffer(screenBuffer, 64);
  delay(3500);
}


void setup(){
 
  initSerialInterface();
  
  pinMode(CableSelectPin, OUTPUT);
  digitalWrite(CableSelectPin, HIGH);

  SPI.setClockDivider(SPI_CLOCK_DIV16);  
  SPI.begin();

  
  setChainLength(1);
  
  delay(3000);

  selfTest();
  clearScreen();
}

void loop(){
  readSerialCommand();
}


