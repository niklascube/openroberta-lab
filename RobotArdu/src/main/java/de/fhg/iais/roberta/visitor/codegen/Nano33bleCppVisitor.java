package de.fhg.iais.roberta.visitor.codegen;

import java.util.List;

import com.google.common.collect.ClassToInstanceMap;

import de.fhg.iais.roberta.bean.IProjectBean;
import de.fhg.iais.roberta.components.ConfigurationAst;
import de.fhg.iais.roberta.syntax.Phrase;
import de.fhg.iais.roberta.syntax.sensors.arduino.nano33blesense.Lsm9ds1AccSensor;
import de.fhg.iais.roberta.visitor.IVisitor;

/**
 * This class is implementing {@link IVisitor}. All methods are implemented and they append a human-readable C representation of a phrase to a StringBuilder.
 * <b>This class generates C++ code for the Arduino Nano 33 BLE.</b> <br>
 */
public class Nano33bleCppVisitor extends ArduinoCppVisitor {
    /**
     * Initialize the C++ code generator visitor.
     *
     * @param phrases to generate the code from
     */
    public Nano33bleCppVisitor(List<List<Phrase<Void>>> phrases, ConfigurationAst brickConfiguration, ClassToInstanceMap<IProjectBean> beans) {
        super(phrases, brickConfiguration, beans);
    }

    @Override
    public Void visitLsm9ds1AccSensor(Lsm9ds1AccSensor<Void> lsm9ds1AccSensor) {
        this.sb
            .append(
                "IMU.accelerationAvailable()?(IMU.readAcceleration(__"
                    + lsm9ds1AccSensor.getX().getValue()
                    + ",__"
                    + lsm9ds1AccSensor.getY().getValue()
                    + ",__"
                    + lsm9ds1AccSensor.getZ().getValue()
                    + "),TRUE) : FALSE");
        return null;
    }
}
