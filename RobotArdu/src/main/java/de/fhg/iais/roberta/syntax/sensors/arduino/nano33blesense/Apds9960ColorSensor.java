package de.fhg.iais.roberta.syntax.sensors.arduino.nano33blesense;

import java.util.List;

import de.fhg.iais.roberta.blockly.generated.Block;
import de.fhg.iais.roberta.blockly.generated.Value;
import de.fhg.iais.roberta.syntax.BlockTypeContainer;
import de.fhg.iais.roberta.syntax.BlocklyBlockProperties;
import de.fhg.iais.roberta.syntax.BlocklyComment;
import de.fhg.iais.roberta.syntax.BlocklyConstants;
import de.fhg.iais.roberta.syntax.Phrase;
import de.fhg.iais.roberta.syntax.lang.expr.Var;
import de.fhg.iais.roberta.syntax.sensor.BuiltinSensor;
import de.fhg.iais.roberta.transformer.AbstractJaxb2Ast;
import de.fhg.iais.roberta.transformer.Ast2JaxbHelper;
import de.fhg.iais.roberta.visitor.IVisitor;
import de.fhg.iais.roberta.visitor.hardware.IArduinoVisitor;

public class Apds9960ColorSensor<V> extends BuiltinSensor<V> {

    private final Var<V> x, y, z;

    public Var<V> getX() {
        return x;
    }

    public Var<V> getY() {
        return y;
    }

    public Var<V> getZ() {
        return z;
    }

    private Apds9960ColorSensor(BlocklyBlockProperties properties, BlocklyComment comment, Var<V> x, Var<V> y, Var<V> z) {
        super(null, BlockTypeContainer.getByName("APDS9960_COLOR"), properties, comment);
        this.x = x;
        this.y = y;
        this.z = z;
        setReadOnly();
    }

    @Override
    protected V acceptImpl(IVisitor<V> visitor) {
        return ((IArduinoVisitor<V>) visitor).visitApds9960ColorSensor(this);
    }

    public static <V> Apds9960ColorSensor<V> make(BlocklyBlockProperties properties, BlocklyComment comment, Var<V> x, Var<V> y, Var<V> z) {
        return new Apds9960ColorSensor<>(properties, comment, x, y, z);
    }

    /**
     * Transformation from JAXB object to corresponding AST object.
     *
     * @param block for transformation
     * @param helper class for making the transformation
     * @return corresponding AST object
     */
    public static <V> Phrase<V> jaxbToAst(Block block, AbstractJaxb2Ast<V> helper) {
        List<Value> values = AbstractJaxb2Ast.extractValues(block, (short) 3);
        Var<V> x = helper.getVar(values, BlocklyConstants.X);
        Var<V> y = helper.getVar(values, BlocklyConstants.Y);
        Var<V> z = helper.getVar(values, BlocklyConstants.Z);
        return Apds9960ColorSensor.make(AbstractJaxb2Ast.extractBlockProperties(block), AbstractJaxb2Ast.extractComment(block), x, y, z);
    }

    @Override
    public Block astToBlock() {
        Block block = new Block();
        Ast2JaxbHelper.setBasicProperties(this, block);
        Ast2JaxbHelper.addValue(block, "X", this.x);
        Ast2JaxbHelper.addValue(block, "Y", this.y);
        Ast2JaxbHelper.addValue(block, "Z", this.z);
        return block;
    }
}